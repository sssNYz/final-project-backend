// app/api/mobile/v1/follow/following/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getFollowing } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/follow/following
// Get list of people I'm following (I am the viewer/follower)
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const result = await getFollowing(prismaUser.userId);
            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting following:", error);

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
