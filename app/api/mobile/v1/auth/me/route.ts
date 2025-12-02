import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAuthenticatedUserProfile } from "@/server/auth/auth.service";
import { ServiceError } from "@/server/common/errors";

/**
 * GET /api/mobile/v1/auth/me
 * Get the current authenticated user's profile from Prisma database
 */
export async function GET(request: Request) {
  try {
    // Verify Supabase token
    const supabaseUser = await requireAuth(request);

    const user = await getAuthenticatedUserProfile(supabaseUser);

    // Return user profile (safe fields only, no password)
    return NextResponse.json({ user });

  } catch (error: unknown) {
    console.error("Error getting user profile:", error);

    // Handle auth errors
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing token" },
        { status: 401 }
      );
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(error.body, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
