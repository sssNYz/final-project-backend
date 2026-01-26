// app/api/admin/v1/user-request/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { listUserRequestsForAdmin } from "@/server/userRequest/userRequest.service";
import { ServiceError } from "@/server/common/errors";

export const runtime = "nodejs";

// GET /api/admin/v1/user-request/list
export async function GET(request: NextRequest) {
  return withRole(request, "Admin", async () => {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get("status");
      const type = url.searchParams.get("type");
      const search = url.searchParams.get("search");
      const pageParam = url.searchParams.get("page");
      const pageSizeParam = url.searchParams.get("pageSize");

      const page = pageParam ? Number(pageParam) : 1;
      const pageSize = pageSizeParam ? Number(pageSizeParam) : 10;

      const result = await listUserRequestsForAdmin({
        status,
        type,
        search,
        page,
        pageSize,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
      console.error("Error listing user requests:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
