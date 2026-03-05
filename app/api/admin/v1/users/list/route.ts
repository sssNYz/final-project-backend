import { NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { listAdminAccountsForDashboard } from "@/server/users/users.service";

export async function GET(request: Request) {
  return withRole(request, "Admin", async () => {
    try {
      const url = new URL(request.url);
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const pageSize = Math.max(1, Number(url.searchParams.get("pageSize")) || 20);

      const result = await listAdminAccountsForDashboard(page, pageSize);
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      console.error("Error in GET /api/admin/v1/users/list:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

