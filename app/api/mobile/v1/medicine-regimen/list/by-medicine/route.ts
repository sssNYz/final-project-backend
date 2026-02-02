// app/api/mobile/v1/medicine-regimen/list/by-medicine/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { listMedicineRegimensByListId } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/medicine-regimen/list/by-medicine?medicineListId=...
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const url = new URL(request.url);
            const mediListIdStr = url.searchParams.get("medicineListId");
            const mediListId = Number(mediListIdStr) || null;

            if (!mediListId) {
                return NextResponse.json({ error: "medicineListId query param is required" }, { status: 400 });
            }

            const result = await listMedicineRegimensByListId({
                userId: prismaUser.userId,
                mediListId,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error listing medicine regimens by medicine list:", error);

            if (error instanceof ServiceError) {
                return NextResponse.json(error.body, { status: error.statusCode });
            }

            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }
    });
}
