// app/api/mobile/v1/follow/followers/remove/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { removeFollower } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// DELETE /api/mobile/v1/follow/followers/remove?relationshipId=...
// Remove a follower (cancel the relationship)
export async function DELETE(request: Request) {
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

            const result = await removeFollower({
                ownerUserId: prismaUser.userId,
                relationshipId,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error removing follower:", error);

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
