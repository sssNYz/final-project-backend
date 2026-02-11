
import { NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const DeleteLogSchema = z.object({
    userIds: z.array(z.number()),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
});

export async function DELETE(request: Request) {
    return withRole(request, "Admin", async () => {
        try {
            const body = await request.json();
            const validation = DeleteLogSchema.safeParse(body);

            if (!validation.success) {
                return NextResponse.json(
                    { error: "Invalid request body", details: validation.error.format() },
                    { status: 400 }
                );
            }

            const { userIds, startDate, endDate } = validation.data;

            // 1. Find profileIds belonging to these userIds
            const profiles = await prisma.userProfile.findMany({
                where: {
                    userId: {
                        in: userIds,
                    },
                },
                select: {
                    profileId: true,
                },
            });

            const profileIds = profiles.map((p) => p.profileId);

            if (profileIds.length === 0) {
                return NextResponse.json(
                    { message: "No profiles found for the given users.", count: 0 },
                    { status: 200 }
                );
            }

            // 2. Delete medication logs for these profiles within the time range
            const deleteResult = await prisma.medicationLog.deleteMany({
                where: {
                    profileId: {
                        in: profileIds,
                    },
                    scheduleTime: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                },
            });

            return NextResponse.json(
                { message: "Logs deleted successfully", count: deleteResult.count },
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in DELETE /api/admin/v1/user/delete-log:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}
