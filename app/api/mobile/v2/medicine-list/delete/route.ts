import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { deleteMedicineListV2 } from "@/server/medicineList/medicineList.service";
import { ServiceError } from "@/server/common/errors";

// DELETE /api/mobile/v2/medicine-list/delete
export async function DELETE(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            // V2 only accepts JSON
            let body;
            try {
                body = await request.json();
            } catch (e) {
                return NextResponse.json(
                    { error: "Invalid JSON body" },
                    { status: 400 }
                );
            }

            const { mediListId, confirmation } = body;

            if (!mediListId) {
                return NextResponse.json(
                    { error: "mediListId is required" },
                    { status: 400 }
                );
            }

            const result = await deleteMedicineListV2({
                userId: prismaUser.userId,
                mediListId: Number(mediListId),
                confirmation: String(confirmation),
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error deleting medicine list item (V2):", error);

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
