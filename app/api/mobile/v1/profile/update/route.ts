import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers"; // auth + load prisma user
import { updateProfileForUser } from "@/server/profile/profiles.service";

// PATCH /api/mobile/v1/profile/update
export async function PATCH(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const contentType = request.headers.get("content-type") || "";

      let profileId: number | null = null;
      let profileName: string | null = null;
      let profilePictureFile: { buffer: Buffer; originalFilename: string } | null = null;
      let profilePictureUrl: string | null = null;

      // JSON body (easy for testing)
      if (contentType.includes("application/json")) {
        const body = await request.json();
        profileId = Number(body.profileId) || null;
        profileName = body.profileName ?? null;
        profilePictureUrl = body.profilePicture ?? null;
      }
      // form-data (for file upload)
      else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();

        profileId = Number(formData.get("profileId")) || null;
        profileName = (formData.get("profileName") as string) ?? null;

        const file = formData.get("file") as File | null;
        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          profilePictureFile = {
            buffer: Buffer.from(arrayBuffer),
            originalFilename: file.name,
          };
        }

        profilePictureUrl = (formData.get("profilePicture") as string) ?? null;
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

      const result = await updateProfileForUser({
        userId: prismaUser.userId,
        profileId,
        profileName,
        profilePictureFile,
        profilePictureUrl,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error("Error updating profile:", error);

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