import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

const prisma = new PrismaClient();

/**
 * GET /api/auth/sync-user
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    message: "API Usage Information",
    endpoint: "/api/auth/sync-user",
    method: "POST",
    description: "Sync or create user in Prisma database after Supabase authentication",
    requiredHeaders: {
      "Authorization": "Bearer <supabase_access_token>",
      "Content-Type": "application/json"
    },
    requiredBody: {
      supabaseUserId: "string (required) - Supabase user ID",
      email: "string (required) - User email address",
      provider: "string (required) - One of: 'email', 'google', 'both'",
      allowMerge: "boolean (optional) - Allow account merging if email exists with different provider"
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
      "409": "Account merge required but not allowed",
      "500": "Internal server error"
    }
  }, { status: 200 });
}

/**
 * POST /api/auth/sync-user
 * Sync or create user in Prisma database after Supabase authentication
 * Handles account merging with user permission
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
    if (!["email", "google", "both"].includes(provider)) {
      return NextResponse.json(
        { error: "provider must be 'email', 'google', or 'both'" },
        { status: 400 }
      );
    }

    // Verify that the token matches the request data
    if (supabaseUser.id !== supabaseUserId || supabaseUser.email !== email) {
      return NextResponse.json(
        { error: "Token does not match provided user data" },
        { status: 403 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look for existing user by supabaseUserId or email
    let existingUser = await prisma.userAccount.findFirst({
      where: {
        OR: [
          { supabaseUserId: supabaseUserId },
          { email: normalizedEmail }
        ]
      }
    });

    // If no user exists, create a new one
    if (!existingUser) {
      const newUser = await prisma.userAccount.create({
        data: {
          email: normalizedEmail,
          supabaseUserId: supabaseUserId,
          provider: provider,
          password: null, // No password for OAuth users
          lastLogin: new Date(),
        },
      });

      return NextResponse.json({
        message: "User created successfully",
        user: {
          userId: newUser.userId,
          email: newUser.email,
          provider: newUser.provider,
          supabaseUserId: newUser.supabaseUserId,
          role: newUser.role,
          tutorialDone: newUser.tutorialDone,
          createdAt: newUser.createdAt,
        },
      }, { status: 201 });
    }

    // User exists - check if merge is needed
    const existingProvider = existingUser.provider;
    let needsMerge = false;
    let newProvider = provider;

    // Determine if this is a merge case
    if (existingProvider && existingProvider !== provider) {
      needsMerge = true;
      newProvider = "both";
    }

    // If merge is needed but not allowed, return error
    if (needsMerge && allowMerge !== true) {
      return NextResponse.json(
        { 
          error: "Account merge required but not allowed",
          message: "This email is already registered with a different login method. Please allow account merge to continue."
        },
        { status: 409 }
      );
    }

    // Update existing user
    const updatedUser = await prisma.userAccount.update({
      where: { userId: existingUser.userId },
      data: {
        supabaseUserId: supabaseUserId,
        provider: newProvider,
        lastLogin: new Date(),
      },
    });

    return NextResponse.json({
      message: needsMerge ? "Accounts merged successfully" : "User updated successfully",
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        provider: updatedUser.provider,
        supabaseUserId: updatedUser.supabaseUserId,
        role: updatedUser.role,
        tutorialDone: updatedUser.tutorialDone,
        createdAt: updatedUser.createdAt,
      },
    });

  } catch (error: any) {
    console.error("Error syncing user:", error);

    // Handle auth errors
    if (error.message === "Unauthorized") {
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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


