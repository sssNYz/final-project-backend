// app/api/admin/v1/medicine/delete/route.ts
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { ServiceError } from "@/server/common/errors";
import { deleteMedicineForAdmin } from "@/server/medicine/medicine.service";

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
    const url = new URL(request.url);
    const mediIdParam = url.searchParams.get("mediId");
    const mediId = mediIdParam ? Number(mediIdParam) : NaN;

    if (!mediId || Number.isNaN(mediId)) {
      throw new ServiceError(400, { error: "mediId is required and must be a number" });
    }

    const result = await deleteMedicineForAdmin({
      supabaseUser,
      mediId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}