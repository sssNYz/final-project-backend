// app/api/mobile/v1/medication-log/response/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { handleMedicationResponse } from "@/server/medicationLog/medicationLog.service";
import { ServiceError } from "@/server/common/errors";
import { ResponseStatus } from "@prisma/client";

// POST /api/mobile/v1/medication-log/response
// Body: { logId: number, responseStatus: "TAKE" | "SKIP" | "SNOOZE", note?: string }
export async function POST(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const body = await request.json();
            const { logId, responseStatus, note } = body;

            // Validate logId
            if (!logId || typeof logId !== "number") {
                return NextResponse.json(
                    { error: "logId is required and must be a number" },
                    { status: 400 }
                );
            }

            // Validate responseStatus
            const validStatuses: ResponseStatus[] = ["TAKE", "SKIP", "SNOOZE"];
            if (!responseStatus || !validStatuses.includes(responseStatus)) {
                return NextResponse.json(
                    { error: `responseStatus must be one of: ${validStatuses.join(", ")}` },
                    { status: 400 }
                );
            }

            const result = await handleMedicationResponse({
                userId: prismaUser.userId,
                logId,
                responseStatus,
                note: note ?? undefined,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error handling medication response:", error);

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
