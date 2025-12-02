import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateCurrentUserProfile } from "@/server/users/users.service";
import { ServiceError } from "@/server/common/errors";

/**
 * PATCH /api/mobile/v1/users/update
 * Update the current authenticated user's profile
 * Only allows updating safe fields (not email, password, supabaseUserId, provider)
 */
export async function PATCH(request: Request) {
  try {
    // Verify Supabase token
    const supabaseUser = await requireAuth(request);

    // Parse request body
    const body = await request.json();

    const result = await updateCurrentUserProfile({
      supabaseUser,
      body,
    });

    // Return updated user profile (safe fields only)
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error("Error updating user:", error);

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

/**
 * POST /api/mobile/v1/users/update (alternative to PATCH)
 */
export async function POST(request: Request) {
  return PATCH(request);
}
