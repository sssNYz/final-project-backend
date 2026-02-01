// app/api/mobile/v1/medication-log/[logId]/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getMedicationLogDetail } from "@/server/medicationLog/medicationLog.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/medication-log/:logId
export async function GET(
    request: Request,
    { params }: { params: Promise<{ logId: string }> }
) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const { logId: logIdStr } = await params;
            const logId = Number(logIdStr);

            if (!logId || isNaN(logId)) {
                return NextResponse.json(
                    { error: "Invalid logId parameter" },
                    { status: 400 }
                );
            }

            const result = await getMedicationLogDetail({
                userId: prismaUser.userId,
                logId,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting medication log detail:", error);

            if (error instanceof ServiceError) {
                return NextResponse.json(error.body, { status: error.statusCode });
            }

            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}
