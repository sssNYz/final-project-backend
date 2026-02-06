// app/api/mobile/v1/follow/followers/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getFollowers } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/follow/followers
// Get list of users following me (I am the owner/sender)
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const result = await getFollowers(prismaUser.userId);
            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting followers:", error);

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
