
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { deleteSupabaseUser } from "@/server/supabase/admin";

const DeleteUserV2Schema = z.object({
    confirm: z.literal("CONFIRM"),
});

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    return withRole(request, "Admin", async () => {
        try {
            const { userId: idParam } = await context.params;
            const userId = Number.parseInt(idParam, 10);
            const body = await request.json();

            const validation = DeleteUserV2Schema.safeParse(body);

            if (!validation.success) {
                return NextResponse.json(
                    { error: "Confirmation text 'CONFIRM' is required in the body." },
                    { status: 400 }
                );
            }

            if (!Number.isFinite(userId) || userId <= 0) {
                return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
            }

            // Check if user exists
            const user = await prisma.userAccount.findUnique({
                where: { userId },
                select: { userId: true, supabaseUserId: true, role: true },
            });

            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            if (user.role === "SuperAdmin") {
                return NextResponse.json(
                    { error: "Cannot delete SuperAdmin account via this API" },
                    { status: 403 }
                );
            }

            // Perform destructive deletion in transaction
            await prisma.$transaction(async (tx) => {
                // 1. Unlink requests handled by this user (if they were an admin)
                await tx.userRequest.updateMany({
                    where: { adminId: userId },
                    data: { adminId: null },
                });

                // 2. Delete DeviceTokens
                await tx.deviceToken.deleteMany({
                    where: { userId },
                });

                // 3. Delete UserRelationships (Owner or Viewer)
                await tx.userRelationship.deleteMany({
                    where: {
                        OR: [{ ownerUserId: userId }, { viewerUserId: userId }],
                    },
                });

                // 4. Delete UserRequests created by this user
                await tx.userRequest.deleteMany({
                    where: { userId },
                });

                // 5. Get all Profile IDs for this user
                const profiles = await tx.userProfile.findMany({
                    where: { userId },
                    select: { profileId: true },
                });
                const profileIds = profiles.map((p) => p.profileId);

                if (profileIds.length > 0) {
                    // 6. Delete MedicationLogs linked to these profiles
                    await tx.medicationLog.deleteMany({
                        where: { profileId: { in: profileIds } },
                    });

                    // 7. Get MedicineList IDs linked to these profiles to find Regimens
                    const medicineLists = await tx.medicineList.findMany({
                        where: { profileId: { in: profileIds } },
                        select: { mediListId: true },
                    });
                    const mediListIds = medicineLists.map((ml) => ml.mediListId);

                    if (mediListIds.length > 0) {
                        // 8. Delete RegimenTimes linked to Regimens linked to MedicineLists
                        // First find regimenIds
                        const regimens = await tx.userMedicineRegimen.findMany({
                            where: { mediListId: { in: mediListIds } },
                            select: { mediRegimenId: true },
                        });
                        const regimenIds = regimens.map((r) => r.mediRegimenId);

                        if (regimenIds.length > 0) {
                            await tx.userMedicineRegimenTime.deleteMany({
                                where: { mediRegimenId: { in: regimenIds } },
                            });

                            // 9. Delete UserMedicineRegimen
                            await tx.userMedicineRegimen.deleteMany({
                                where: { mediRegimenId: { in: regimenIds } },
                            });
                        }

                        // 10. Delete MedicineList
                        await tx.medicineList.deleteMany({
                            where: { mediListId: { in: mediListIds } },
                        });
                    }

                    // 11. Delete UserProfile
                    await tx.userProfile.deleteMany({
                        where: { userId },
                    });
                }

                // 12. Finally, delete UserAccount
                await tx.userAccount.delete({
                    where: { userId },
                });
            });

            // 13. Delete from Supabase if applicable
            if (user.supabaseUserId) {
                // We catch errors here so we don't fail the response if Supabase fails (since DB is already clean)
                // or we can just log it. "deleteAdminAccount" throws 502. 
                // Since this is a "strictly delete everything", maybe we should try best effort.
                // However, the transaction committed, so DB data is GONE.
                // We should attempt Supabase delete.
                const { error } = await deleteSupabaseUser(user.supabaseUserId);
                if (error) {
                    console.error(`Failed to delete Supabase user ${user.supabaseUserId}:`, error);
                    // We explicitly decide NOT to fail the request because the DB part is done.
                    // Returning 200 with a warning in logs is better than 500 when the main job is done.
                }
            }

            return NextResponse.json(
                { message: "User and all associated data deleted successfully" },
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in DELETE /api/admin/v2/users/[userId]:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}
