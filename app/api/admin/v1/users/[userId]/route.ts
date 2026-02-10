import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { deleteAdminAccount } from "@/server/users/users.service";
import { ServiceError } from "@/server/common/errors";

// DELETE /api/admin/v1/users/[userId]
// ลบบัญชีผู้ใช้งานฝั่งแอดมินจากฐานข้อมูล โดยสามารถระบุจาก userId (path/body) หรือ email (query/body)
// ต้องเป็นผู้ใช้ที่ล็อกอินและผ่านการตรวจสอบสิทธิ์แล้ว (withAuth)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  return withRole(request, "Admin", async () => {
    try {
      const { userId: idParam } = await context.params;
      const userId = Number.parseInt(idParam, 10);
      const { searchParams } = new URL(request.url);
      const email = searchParams.get("email");

      await deleteAdminAccount({
        userId: Number.isFinite(userId) && userId > 0 ? userId : undefined,
        email,
      });

      return NextResponse.json(
        { message: "User deleted successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in DELETE /api/admin/v1/users/[userId]:", error);

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


// PATCH /api/admin/v1/users/[userId]
// อัปเดตสถานะของผู้ใช้งาน (banned/active)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  return withRole(request, "Admin", async () => {
    try {
      const { userId: idParam } = await context.params;
      const userId = Number.parseInt(idParam, 10);
      const body = await request.json();
      const { status } = body;

      if (typeof status !== "boolean") {
        return NextResponse.json(
          { error: "status must be a boolean" },
          { status: 400 }
        );
      }

      if (!Number.isFinite(userId) || userId <= 0) {
        return NextResponse.json(
          { error: "Invalid userId" },
          { status: 400 }
        );
      }

      // Dynamic import to avoid circular dependency issues if any, though likely safe here
      const { adminUpdateUserStatus } = await import("@/server/users/users.service");

      const updatedUser = await adminUpdateUserStatus(userId, status);

      return NextResponse.json(
        { message: "User status updated successfully", user: updatedUser },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in PATCH /api/admin/v1/users/[userId]:", error);

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
