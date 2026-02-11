// app/api/mobile/v1/follow/followers/update/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { updateFollower } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// PATCH /api/mobile/v1/follow/followers/update?relationshipId=...
// Update follower nickname, picture, and/or shared profiles
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

            let name: string | undefined;
            let accountPictureFile: { buffer: Buffer; originalFilename: string } | null = null;
            let profileIds: number[] | undefined;

            if (contentType.includes("multipart/form-data")) {
                const formData = await request.formData();

                // Parse name (nickname)
                const rawName = formData.get("name");
                if (rawName && typeof rawName === "string") {
                    name = rawName;
                }

                // Parse picture file
                const rawPicture = formData.get("accountPicture");
                if (rawPicture instanceof File) {
                    const arrayBuffer = await rawPicture.arrayBuffer();
                    accountPictureFile = {
                        buffer: Buffer.from(arrayBuffer),
                        originalFilename: rawPicture.name,
                    };
                }

                // Parse profileIds from string
                const rawProfileIds = formData.get("profileIds");
                if (rawProfileIds && typeof rawProfileIds === "string") {
                    try {
                        profileIds = JSON.parse(rawProfileIds);
                    } catch {
                        // ignore invalid json
                    }
                }
            } else {
                const body = await request.json();
                name = body.name;
                profileIds = body.profileIds;
            }

            const result = await updateFollower({
                ownerUserId: prismaUser.userId,
                relationshipId,
                profileIds,
                name,
                accountPictureFile,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error updating follower:", error);

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
