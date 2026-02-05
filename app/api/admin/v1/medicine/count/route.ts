// app/api/admin/v1/medicine/count/route.ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

import { requireAuth } from "@/lib/auth";
import { ServiceError } from "@/server/common/errors";
import { getMedicineCountForAdmin } from "@/server/medicine/medicine.service";

function toErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return {
      status: error.statusCode,
      body: error.body,
    };
  }

  console.error("Error in medicine count:", error);
  return {
    status: 500,
    body: { error: "Internal server error" },
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await requireAuth(request);

    const url = new URL(request.url);
    const includeDeletedParam = url.searchParams.get("includeDeleted");
    const includeDeleted =
      includeDeletedParam === "true" || includeDeletedParam === "1";

    const result = await getMedicineCountForAdmin({
      supabaseUser,
      includeDeleted,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

