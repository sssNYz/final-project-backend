import { NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { listAdminAccountsForDashboard } from "@/server/users/users.service";

export async function GET(request: Request) {
  return withRole(request, "Admin", async () => {
    try {
      const accounts = await listAdminAccountsForDashboard();
      return NextResponse.json({ accounts }, { status: 200 });
    } catch (error) {
      console.error("Error in GET /api/admin/v1/users/list:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

