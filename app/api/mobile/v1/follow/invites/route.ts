// app/api/mobile/v1/follow/invites/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { getPendingInvites } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/follow/invites
// Get my pending invites (where I am the viewer/follower)
export async function GET(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const result = await getPendingInvites(prismaUser.userId);
            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error getting invites:", error);

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
