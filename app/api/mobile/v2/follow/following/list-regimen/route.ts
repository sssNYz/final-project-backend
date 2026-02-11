// app/api/mobile/v2/follow/following/list-regimen/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getFollowingRegimensV2 } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v2/follow/following/list-regimen?relationshipId=...&profileId=...
// Get medicine regimens for a followed profile (see what medicine someone takes)
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const url = new URL(request.url);
            const relationshipIdStr = url.searchParams.get("relationshipId");
            const profileIdStr = url.searchParams.get("profileId");
            const relationshipId = Number(relationshipIdStr) || null;
            const profileId = Number(profileIdStr) || null;

            if (!relationshipId) {
                return NextResponse.json(
                    { error: "relationshipId query param is required" },
                    { status: 400 }
                );
            }

            if (!profileId) {
                return NextResponse.json(
                    { error: "profileId query param is required" },
                    { status: 400 }
                );
            }

            const result = await getFollowingRegimensV2({
                viewerUserId: prismaUser.userId,
                relationshipId,
                profileId,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting following regimens:", error);

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
