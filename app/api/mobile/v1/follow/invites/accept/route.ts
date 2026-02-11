// app/api/mobile/v1/follow/invites/accept/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { acceptInvite } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// POST /api/mobile/v1/follow/invites/accept?relationshipId=...
// Accept an invite
export async function POST(request: Request) {
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

            const result = await acceptInvite({
                viewerUserId: prismaUser.userId,
                relationshipId,
            });

            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error accepting invite:", error);

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
