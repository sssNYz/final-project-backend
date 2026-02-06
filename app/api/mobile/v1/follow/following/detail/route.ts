// app/api/mobile/v1/follow/following/detail/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getFollowingDetail } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/follow/following/detail?relationshipId=...
// Get details of a specific following relationship (profiles they shared)
export async function GET(request: Request) {
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

            const result = await getFollowingDetail({
                viewerUserId: prismaUser.userId,
                relationshipId,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting following detail:", error);

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
