import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AuthProvider, syncUserAccount } from "@/server/auth/auth.service";
import { ServiceError } from "@/server/common/errors";

const ALLOWED_PROVIDERS: AuthProvider[] = ["email", "google", "email,google", "both"];

/**
 * GET /api/mobile/v1/auth/sync-user
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    message: "API Usage Information",
    endpoint: "/api/mobile/v1/auth/sync-user",
    method: "POST",
    description: "Sync or create user in Prisma database after Supabase authentication",
    requiredHeaders: {
      "Authorization": "Bearer <supabase_access_token>",
      "Content-Type": "application/json"
    },
    requiredBody: {
      supabaseUserId: "string (required) - Supabase user ID",
      email: "string (required) - User email address",
      provider: "string (required) - One of: 'email', 'google', 'email,google' (legacy 'both' also accepted)",
      allowMerge: "boolean (optional) - Legacy flag (accepted but no longer required)"
    },
    exampleRequest: {
      method: "POST",
      headers: {
        "Authorization": "Bearer your_supabase_access_token",
        "Content-Type": "application/json"
      },
      body: {
        supabaseUserId: "user-id-from-supabase",
        email: "user@example.com",
        provider: "google",
        allowMerge: true
      }
    },
    possibleResponses: {
      "201": "User created successfully",
      "200": "User updated or merged successfully",
      "400": "Missing required fields or invalid provider value",
      "401": "Unauthorized - Invalid or missing token",
      "403": "Token does not match provided user data",
      "500": "Internal server error"
    }
  }, { status: 200 });
}

/**
 * POST /api/mobile/v1/auth/sync-user
 * Sync or create user in Prisma database after Supabase authentication
 * Auto-merges providers by email (stores provider as 'email', 'google', or 'email,google')
 */
export async function POST(request: Request) {
  try {
    // Verify Supabase token
    const supabaseUser = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const { supabaseUserId, email, provider, allowMerge } = body;

    // Validate required fields
    if (!supabaseUserId || !email || !provider) {
      return NextResponse.json(
        { error: "supabaseUserId, email, and provider are required" },
        { status: 400 }
      );
    }

    // Validate provider value
    if (!ALLOWED_PROVIDERS.includes(provider as AuthProvider)) {
      return NextResponse.json(
        { error: "provider must be 'email', 'google', or 'email,google' (legacy 'both' also accepted)" },
        { status: 400 }
      );
    }

    const providerValue = provider as AuthProvider;

    const result = await syncUserAccount({
      supabaseUser,
      supabaseUserId,
      email,
      provider: providerValue,
      allowMerge,
    });

    return NextResponse.json(
      {
        message: result.message,
        user: result.user,
      },
      { status: result.statusCode }
    );

  } catch (error: unknown) {
    console.error("Error syncing user:", error);

    // Handle auth errors
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { 
          error: "Unauthorized - Invalid or missing token",
          message: "Please include a valid Authorization header with your Supabase access token",
          help: "Add header: Authorization: Bearer <your_supabase_access_token>",
          example: {
            headers: {
              "Authorization": "Bearer your_supabase_access_token_here"
            }
          }
        },
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
