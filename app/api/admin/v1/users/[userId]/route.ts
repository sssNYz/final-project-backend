import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { ServiceError } from "@/server/common/errors";
import { deleteAdminAccount } from "@/server/users/users.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> } // ✅ Next 16 type, same as working delete
) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      // ✅ get userId from path
      const { userId: userIdParam } = await params;

      const contentType = request.headers.get("content-type") || "";
      const searchParams = request.nextUrl.searchParams;

      // --- read from URL query ---
      let email: string | null = searchParams.get("email");

      // --- read from body (optional) ---
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

      // --- choose final userId: path first, then body ---
      const parsedFromParam = Number(userIdParam);
      let finalUserId: number | undefined;

      if (Number.isInteger(parsedFromParam) && parsedFromParam > 0) {
        finalUserId = parsedFromParam;
      } else if (bodyUserId && bodyUserId > 0) {
        finalUserId = bodyUserId;
      } else {
        finalUserId = undefined;
      }

      // need userId or email
      if (!finalUserId && !email) {
        return NextResponse.json(
          { error: "ต้องระบุ userId หรือ email อย่างน้อยหนึ่งค่า" },
          { status: 400 }
        );
      }

      await deleteAdminAccount({
        userId: finalUserId,
        email: email ?? undefined,
        // you can also pass admin info from prismaUser here if needed
        // adminId: prismaUser.userId,
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