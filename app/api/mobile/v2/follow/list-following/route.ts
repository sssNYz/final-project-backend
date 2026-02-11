// app/api/mobile/v2/follow/list-following/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getFollowingV2 } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v2/follow/list-following
// Get people I follow (shows ownerNickname/ownerPicture set by viewer)
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const result = await getFollowingV2(prismaUser.userId);
            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting following list:", error);

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
