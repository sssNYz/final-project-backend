// app/api/mobile/v2/follow/update-following/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { updateFollowing } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// PATCH /api/mobile/v2/follow/update-following?relationshipId=...
// Viewer (follower) updates owner's nickname and picture
export async function PATCH(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const url = new URL(request.url);
            const relationshipIdStr = url.searchParams.get("relationshipId");
            const relationshipId = Number(relationshipIdStr) || null;

            if (!relationshipId) {
                return NextResponse.json(
                    { error: "relationshipId query param is required" },
                    { status: 400 }
                );
            }

            const contentType = request.headers.get("content-type") || "";

            let ownerNickname: string | undefined;
            let ownerPictureFile: { buffer: Buffer; originalFilename: string } | null = null;

            if (contentType.includes("multipart/form-data")) {
                const formData = await request.formData();

                // Parse nickname
                const rawName = formData.get("ownerNickname");
                if (rawName && typeof rawName === "string") {
                    ownerNickname = rawName;
                }

                // Parse picture file
                const rawPicture = formData.get("ownerPicture");
                if (rawPicture instanceof File) {
                    const arrayBuffer = await rawPicture.arrayBuffer();
                    ownerPictureFile = {
                        buffer: Buffer.from(arrayBuffer),
                        originalFilename: rawPicture.name,
                    };
                }
            } else {
                const body = await request.json();
                ownerNickname = body.ownerNickname;
            }

            const result = await updateFollowing({
                viewerUserId: prismaUser.userId,
                relationshipId,
                ownerNickname,
                ownerPictureFile,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error updating following:", error);

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
