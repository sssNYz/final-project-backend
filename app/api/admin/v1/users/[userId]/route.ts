import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { ServiceError } from "@/server/common/errors";
import { deleteAdminAccount } from "@/server/users/users.service";

// DELETE /api/admin/v1/users/[userId]
// ลบบัญชีผู้ใช้งานฝั่งแอดมินจากฐานข้อมูล โดยสามารถระบุจาก userId (path/body) หรือ email (query/body)
// ต้องเป็นผู้ใช้ที่ล็อกอินและผ่านการตรวจสอบสิทธิ์แล้ว (withAuth)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> } // ✅ รูปแบบ type ตาม Next 16
) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      // อ่าน userId จาก path parameter
      const { userId: userIdParam } = await params;

      const contentType = request.headers.get("content-type") || "";
      const searchParams = request.nextUrl.searchParams;

      // อ่าน email จาก query string ถ้ามี
      let email: string | null = searchParams.get("email");

      // อ่าน userId/email จาก body (ถ้าส่งมา)
      let bodyUserId: number | null = null;

      if (contentType.includes("application/json")) {
        const body = await request.json();

        if (body.userId !== undefined) {
          bodyUserId = Number(body.userId) || null;
        }
        if (body.email !== undefined && !email) {
          email = String(body.email);
        }
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const formUserId = formData.get("userId");

        if (formUserId !== null) {
          bodyUserId = Number(formUserId) || null;
        }

        if (!email) {
          const formEmail = formData.get("email");
          if (formEmail !== null) {
            email = String(formEmail);
          }
        }
      }

      // เลือก userId สุดท้าย: ให้ความสำคัญ path ก่อน จากนั้น body
      const parsedFromParam = Number(userIdParam);
      let finalUserId: number | undefined;

      if (Number.isInteger(parsedFromParam) && parsedFromParam > 0) {
        finalUserId = parsedFromParam;
      } else if (bodyUserId && bodyUserId > 0) {
        finalUserId = bodyUserId;
      } else {
        finalUserId = undefined;
      }

      // ต้องมีอย่างน้อย userId หรือ email อย่างใดอย่างหนึ่ง
      if (!finalUserId && !email) {
        return NextResponse.json(
          { error: "ต้องระบุ userId หรือ email อย่างน้อยหนึ่งค่า" },
          { status: 400 }
        );
      }

      await deleteAdminAccount({
        userId: finalUserId,
        email: email ?? undefined,
        // สามารถส่งข้อมูลแอดมินที่ลบไปด้วยได้ผ่าน prismaUser ถ้าต้องการ log เพิ่ม
      });

      return NextResponse.json(
        { message: "ลบบัญชีผู้ใช้งานสำเร็จ" },
        { status: 200 }
      );
    } catch (error: unknown) {
      console.error("Error deleting admin account:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json(
        { error: "ไม่สามารถลบบัญชีผู้ใช้งานได้" },
        { status: 500 }
      );
    }
  });
}
