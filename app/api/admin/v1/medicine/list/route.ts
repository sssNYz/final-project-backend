// app/api/admin/v1/medicine/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MedicineType } from "@prisma/client";

import { requireAuth } from "@/lib/auth";
import { ServiceError } from "@/server/common/errors";
import { listMedicinesForAdmin } from "@/server/medicine/medicine.service";

function toErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return {
      status: error.statusCode,
      body: error.body,
    };
  }

  console.error("Error in list medicines:", error);
  return {
    status: 500,
    body: { error: "Internal server error" },
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await requireAuth(request);

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const typeParam =
      url.searchParams.get("mediType") ?? url.searchParams.get("type");
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize");
    const orderParam = url.searchParams.get("order");
    const includeDeletedParam = url.searchParams.get("includeDeleted");

    const type = typeParam ? (typeParam as MedicineType) : null;
    const page = pageParam ? Number(pageParam) : 1;
    const pageSize = pageSizeParam ? Number(pageSizeParam) : 10;

    // order:
    // - default: A-Z (asc)
    // - allow: "asc", "desc", "A-Z", "Z-A"
    const orderRaw = (orderParam ?? "A-Z").trim().toUpperCase();
    const order =
      orderRaw === "DESC" || orderRaw === "Z-A" ? ("desc" as const) : ("asc" as const);

    const includeDeleted =
      includeDeletedParam === "true" || includeDeletedParam === "1";

    const result = await listMedicinesForAdmin({
      supabaseUser,
      search,
      type,
      page,
      pageSize,
      order,
      includeDeleted,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}