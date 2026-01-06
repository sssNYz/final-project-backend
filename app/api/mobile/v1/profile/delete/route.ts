import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { deleteProfileForUser } from "@/server/profile/profiles.service";

// DELETE /api/mobile/v1/profile/delete
export async function DELETE(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      let profileId: number | null = null;

      // 1) Try query param first (Swagger/curl friendly): ?profileId=1
      try {
        const { searchParams } = new URL(request.url);
        const qp = searchParams.get("profileId");
        if (qp !== null) {
          profileId = Number(qp) || null;
        }
      } catch {
        // ignore URL parse issues; fallback to body parsing below
      }

      // 2) Fallback: body (JSON or multipart/form-data)
      const contentType = request.headers.get("content-type") || "";

      // JSON body
      if (!profileId && contentType.includes("application/json")) {
        const body = await request.json();
        profileId = Number(body.profileId) || null;
      }
      // form-data
      else if (!profileId && contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        profileId = Number(formData.get("profileId")) || null;
      } else if (!profileId) {
        return NextResponse.json(
          { error: "Content-Type must be application/json or multipart/form-data" },
          { status: 400 }
        );
      }

      if (!profileId) {
        return NextResponse.json(
          { error: "profileId is required" },
          { status: 400 }
        );
      }

      const result = await deleteProfileForUser({
        userId: prismaUser.userId,
        profileId,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error("Error deleting profile:", error);

      if (error?.statusCode && error?.body) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}