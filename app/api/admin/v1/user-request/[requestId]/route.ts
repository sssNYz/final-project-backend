// app/api/admin/v1/user-request/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";
import {
  updateUserRequestStatusForAdmin,
  deleteUserRequestForAdmin,
} from "@/server/userRequest/userRequest.service";
import { ServiceError } from "@/server/common/errors";

export const runtime = "nodejs";

// PATCH /api/admin/v1/user-request/[requestId]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  return withRole(request, "Admin", async ({ prismaUser }) => {
    try {
      const { requestId: idParam } = await context.params;
      const requestId = Number(idParam);

      if (!requestId || Number.isNaN(requestId)) {
        return NextResponse.json(
          { error: "requestId must be a number" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const status = body.status;

      const result = await updateUserRequestStatusForAdmin({
        requestId,
        status,
        adminId: prismaUser.userId,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
      console.error("Error updating user request:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

// DELETE /api/admin/v1/user-request/[requestId]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  return withRole(request, "Admin", async () => {
    try {
      const { requestId: idParam } = await context.params;
      const requestId = Number(idParam);

      if (!requestId || Number.isNaN(requestId)) {
        return NextResponse.json(
          { error: "requestId must be a number" },
          { status: 400 }
        );
      }

      const result = await deleteUserRequestForAdmin({ requestId });

      return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
      console.error("Error deleting user request:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
