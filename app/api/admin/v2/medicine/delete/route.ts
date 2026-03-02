import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ServiceError } from "@/server/common/errors";
import { hardDeleteMedicineForAdmin } from "@/server/medicine/medicine.service";

function toErrorResponse(error: unknown) {
    if (error instanceof ServiceError) {
        return {
            status: error.statusCode,
            body: error.body,
        };
    }

    console.error("Error in delete medicine:", error);
    return {
        status: 500,
        body: { error: "Internal server error" },
    };
}

export async function DELETE(request: NextRequest) {
    try {
        const supabaseUser = await requireAuth(request);

        let body;
        try {
            body = await request.json();
        } catch (e) {
            throw new ServiceError(400, { error: "Invalid JSON body" });
        }

        const { mediId } = body;
        const id = Number(mediId);

        if (!mediId || isNaN(id)) {
            throw new ServiceError(400, { error: "mediId is required and must be a number" });
        }

        const result = await hardDeleteMedicineForAdmin({
            supabaseUser,
            mediId: id,
        });

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        const { status, body } = toErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
