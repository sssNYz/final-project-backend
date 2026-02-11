// app/api/mobile/v1/follow/following/logs/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getFollowingLogs } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/follow/following/logs?relationshipId=...&profileId=...&startDate=...&endDate=...
// Get medication logs for a profile that is shared with me
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

            // Optional date filters
            const startDate = url.searchParams.get("startDate") ?? undefined;
            const endDate = url.searchParams.get("endDate") ?? undefined;

            // Optional pagination
            const limitStr = url.searchParams.get("limit");
            const offsetStr = url.searchParams.get("offset");
            const limit = limitStr ? Number(limitStr) : undefined;
            const offset = offsetStr ? Number(offsetStr) : undefined;

            const result = await getFollowingLogs({
                viewerUserId: prismaUser.userId,
                relationshipId,
                profileId,
                startDate,
                endDate,
                limit,
                offset,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting following logs:", error);

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
