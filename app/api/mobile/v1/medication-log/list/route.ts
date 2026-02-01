// app/api/mobile/v1/medication-log/list/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { listMedicationLogs } from "@/server/medicationLog/medicationLog.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/medication-log/list?profileId=...&startDate=...&endDate=...
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const url = new URL(request.url);
            const profileIdStr = url.searchParams.get("profileId");
            const profileId = Number(profileIdStr) || null;

            if (!profileId) {
                return NextResponse.json(
                    { error: "profileId query param is required" },
                    { status: 400 }
                );
            }

            // Optional date filters (ISO format: 2026-02-01 or 2026-02-01T00:00:00Z)
            const startDate = url.searchParams.get("startDate") ?? undefined;
            const endDate = url.searchParams.get("endDate") ?? undefined;

            // Optional pagination
            const limitStr = url.searchParams.get("limit");
            const offsetStr = url.searchParams.get("offset");
            const limit = limitStr ? Number(limitStr) : undefined;
            const offset = offsetStr ? Number(offsetStr) : undefined;

            const result = await listMedicationLogs({
                userId: prismaUser.userId,
                profileId,
                startDate,
                endDate,
                limit,
                offset,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error listing medication logs:", error);

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
