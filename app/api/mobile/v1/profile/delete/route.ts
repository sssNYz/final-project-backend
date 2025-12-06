import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { deleteProfileForUser } from "@/server/profile/profiles.service";

// DELETE /api/mobile/v1/profile/delete
export async function DELETE(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const contentType = request.headers.get("content-type") || "";

      let profileId: number | null = null;

      // JSON body
      if (contentType.includes("application/json")) {
        const body = await request.json();
        profileId = Number(body.profileId) || null;
      }
      // form-data
      else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        profileId = Number(formData.get("profileId")) || null;
      } else {
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