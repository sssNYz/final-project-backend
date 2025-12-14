import { NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import { deleteAdminAccount } from "@/server/users/users.service";
import { ServiceError } from "@/server/common/errors";

// DELETE /api/admin/v1/users/[userId]
// ลบบัญชีผู้ใช้งานฝั่งแอดมินจากฐานข้อมูล โดยสามารถระบุจาก userId (path/body) หรือ email (query/body)
// ต้องเป็นผู้ใช้ที่ล็อกอินและผ่านการตรวจสอบสิทธิ์แล้ว (withAuth)
export async function DELETE(
  request: Request,
  context: { params: { userId: string } }
) {
  return withRole(request, "Admin", async () => {
    try {
      const idParam = context.params?.userId;
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

