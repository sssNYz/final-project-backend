import { NextResponse } from "next/server";

import { listAdminAccountsForDashboard } from "@/server/users/users.service";

// GET /api/admin/v1/users/list
// ดึงรายการบัญชีผู้ใช้งานฝั่งแอดมินทั้งหมด เพื่อใช้แสดงในหน้า Dashboard > บัญชีผู้ใช้งาน
export async function GET() {
  try {
    const accounts = await listAdminAccountsForDashboard();

    const items = accounts.map((account) => ({
      userId: account.userId,
      email: account.email,
      role: account.role,
      active: account.active,
      lastLogin: account.lastLogin ? account.lastLogin.toISOString() : null,
    }));

    return NextResponse.json({ accounts: items }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error loading admin accounts:", error);

    const message =
      error instanceof Error
        ? error.message
        : "โหลดข้อมูลบัญชีผู้ใช้ไม่สำเร็จ";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
