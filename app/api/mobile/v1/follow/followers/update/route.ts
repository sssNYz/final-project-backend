// app/api/mobile/v1/follow/followers/update/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { updateFollower } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// PATCH /api/mobile/v1/follow/followers/update?relationshipId=...
// Update the profiles shared with a follower
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

            const body = await request.json();
            const { profileIds } = body;

            if (!Array.isArray(profileIds)) {
                return NextResponse.json(
                    { error: "profileIds must be an array" },
                    { status: 400 }
                );
            }

            const result = await updateFollower({
                ownerUserId: prismaUser.userId,
                relationshipId,
                profileIds,
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
