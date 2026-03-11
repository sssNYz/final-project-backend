
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";


const BulkDeleteUserV2Schema = z.object({
    userIds: z.array(z.number()),
    confirm: z.literal("CONFIRM"),
});

export async function DELETE(request: NextRequest) {
    return withRole(request, "Admin", async () => {
        try {
            const body = await request.json();
            const validation = BulkDeleteUserV2Schema.safeParse(body);

            if (!validation.success) {
                return NextResponse.json(
                    { error: "Body must include 'userIds' (number[]) and 'confirm': 'CONFIRM'." },
                    { status: 400 }
                );
            }

            const { userIds } = validation.data;
            if (userIds.length === 0) {
                return NextResponse.json({ message: "No users selected for deletion." }, { status: 200 });
            }

            // Check if any SuperAdmin is selected
            const superAdmins = await prisma.userAccount.findMany({
                where: {
                    userId: { in: userIds },
                    role: "SuperAdmin",
                },
                select: { userId: true },
            });

            if (superAdmins.length > 0) {
                return NextResponse.json(
                    { error: "Cannot delete SuperAdmin accounts. Please deselect them." },
                    { status: 403 }
                );
            }

            // Fetch users to get Supabase IDs for later deletion
            const usersToDelete = await prisma.userAccount.findMany({
                where: { userId: { in: userIds } },
                select: { userId: true }
            });

            if (usersToDelete.length === 0) {
                return NextResponse.json({ message: "No matching users found." }, { status: 200 });
            }

            // Perform destructive deletion in single transaction for all users
            await prisma.$transaction(async (tx) => {
                // 1. Unlink requests handled by these users (if they were admins)
                await tx.userRequest.updateMany({
                    where: { adminId: { in: userIds } },
                    data: { adminId: null },
                });

                // 2. Delete DeviceTokens
                await tx.deviceToken.deleteMany({
                    where: { userId: { in: userIds } },
                });

                // 2.1 Delete RefreshTokens (Missing in original code)
                await tx.refreshToken.deleteMany({
                    where: { userId: { in: userIds } },
                });

                // 2.2 Delete PasswordResetTokens
                await tx.passwordResetToken.deleteMany({
                    where: { userId: { in: userIds } },
                });

                // 3. Delete UserRelationships (Owner or Viewer)
                await tx.userRelationship.deleteMany({
                    where: {
                        OR: [{ ownerUserId: { in: userIds } }, { viewerUserId: { in: userIds } }],
                    },
                });

                // 4. Delete UserRequests created by these users
                await tx.userRequest.deleteMany({
                    where: { userId: { in: userIds } },
                });

                // 5. Get all Profile IDs for these users
                const profiles = await tx.userProfile.findMany({
                    where: { userId: { in: userIds } },
                    select: { profileId: true },
                });
                const profileIds = profiles.map((p) => p.profileId);

                if (profileIds.length > 0) {
                    // 6. Delete MedicationLogs linked to these profiles
                    await tx.medicationLog.deleteMany({
                        where: { profileId: { in: profileIds } },
                    });

                    // 7. Get MedicineList IDs linked to these profiles
                    const medicineLists = await tx.medicineList.findMany({
                        where: { profileId: { in: profileIds } },
                        select: { mediListId: true },
                    });
                    const mediListIds = medicineLists.map((ml) => ml.mediListId);

                    if (mediListIds.length > 0) {
                        // 8. Delete Regimen Time
                        // Get regimenIds first
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
                        where: { profileId: { in: profileIds } },
                    });
                }

                // 12. Finally, delete UserAccount
                await tx.userAccount.deleteMany({
                    where: { userId: { in: userIds } },
                });
            });



            return NextResponse.json(
                { message: `Successfully deleted ${usersToDelete.length} users and associated data.` },
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in POST /api/admin/v2/users/delete:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}
