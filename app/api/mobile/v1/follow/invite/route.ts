// app/api/mobile/v1/follow/invite/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { sendInvite } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// POST /api/mobile/v1/follow/invite
// Send an invite to another user by email
export async function POST(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const body = await request.json();
            const { email, profileIds } = body;

            if (!email || typeof email !== "string") {
                return NextResponse.json(
                    { error: "email is required" },
                    { status: 400 }
                );
            }

            const result = await sendInvite({
                ownerUserId: prismaUser.userId,
                email,
                profileIds: profileIds ?? null,
            });

            return NextResponse.json(result, { status: 201 });
        } catch (error: unknown) {
            console.error("Error sending invite:", error);

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
