// app/api/admin/v1/medicine/detail/route.ts
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { ServiceError } from "@/server/common/errors";
import { getMedicineDetailForAdmin } from "@/server/medicine/medicine.service";

function toErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return {
      status: error.statusCode,
      body: error.body,
    };
  }

  console.error("Error in medicine detail:", error);
  return {
    status: 500,
    body: { error: "Internal server error" },
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await requireAuth(request);

    const url = new URL(request.url);
    const mediIdParam = url.searchParams.get("mediId");
    const mediId = mediIdParam ? Number(mediIdParam) : NaN;

    if (!mediIdParam || Number.isNaN(mediId)) {
      return NextResponse.json(
        { error: "mediId is required and must be a number" },
        { status: 400 }
      );
    }

    const result = await getMedicineDetailForAdmin({
      supabaseUser,
      mediId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}


