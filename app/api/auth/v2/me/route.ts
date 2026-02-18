import { NextResponse } from "next/server";
import { withAuthV2 } from "@/lib/auth-v2";

/**
 * GET /api/auth/v2/me
 * Get current user profile (protected by V2 JWT)
 * This is a test/utility endpoint to verify the auth system works
 */
export async function GET(request: Request) {
    return withAuthV2(request, async ({ prismaUser }) => {
        return NextResponse.json({
            user: prismaUser,
        });
    });
}
