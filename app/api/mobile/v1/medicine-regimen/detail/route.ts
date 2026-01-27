// app/api/mobile/v1/medicine-regimen/detail/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getMedicineRegimenById } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/medicine-regimen/detail?mediRegimenId=...
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const { searchParams } = new URL(request.url);
            const mediRegimenIdStr = searchParams.get("mediRegimenId");

            if (!mediRegimenIdStr) {
                return NextResponse.json({ error: "mediRegimenId is required" }, { status: 400 });
            }

            const mediRegimenId = parseInt(mediRegimenIdStr, 10);
            if (isNaN(mediRegimenId) || mediRegimenId < 1) {
                return NextResponse.json({ error: "mediRegimenId must be a positive integer" }, { status: 400 });
            }

            const result = await getMedicineRegimenById({
                userId: prismaUser.userId,
                mediRegimenId,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting medicine regimen:", error);

            if (error instanceof ServiceError) {
                return NextResponse.json(error.body, { status: error.statusCode });
            }

            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }
    });
}
