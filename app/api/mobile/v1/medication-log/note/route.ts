// app/api/mobile/v1/medication-log/note/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { updateMedicationLogNote } from "@/server/medicationLog/medicationLog.service";
import { ServiceError } from "@/server/common/errors";

// PATCH /api/mobile/v1/medication-log/note
// Body: { logId: number, note: string }
export async function PATCH(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const body = await request.json();
            const { logId, note } = body;

            // Validate logId
            if (!logId || typeof logId !== "number") {
                return NextResponse.json(
                    { error: "logId is required and must be a number" },
                    { status: 400 }
                );
            }

            // Validate note
            if (typeof note !== "string" || note.trim().length === 0) {
                return NextResponse.json(
                    { error: "note is required and must be a non-empty string" },
                    { status: 400 }
                );
            }

            const result = await updateMedicationLogNote({
                userId: prismaUser.userId,
                logId,
                note: note.trim(),
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error updating medication log note:", error);

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
