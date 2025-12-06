import { NextResponse } from "next/server";

import { ServiceError } from "@/server/common/errors";
import { deleteAdminAccount } from "@/server/users/users.service";

type RouteParams = {
  params: {
    userId: string;
  };
};

export async function DELETE(request: Request, { params }: RouteParams) {
  const searchParams = new URL(request.url).searchParams;
  const email = searchParams.get("email");
  const parsedId = Number(params.userId);
  const userId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined;

  try {
    await deleteAdminAccount({
      userId,
      email,
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
}
