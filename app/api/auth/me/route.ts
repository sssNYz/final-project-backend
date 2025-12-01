import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

const prisma = new PrismaClient();

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile from Prisma database
 */
export async function GET(request: Request) {
  try {
    // Verify Supabase token
    const supabaseUser = await requireAuth(request);

    // Find user in Prisma database by supabaseUserId or email
    const user = await prisma.userAccount.findFirst({
      where: {
        OR: [
          { supabaseUserId: supabaseUser.id },
          { email: supabaseUser.email }
        ]
      },
      include: {
        profiles: {
          select: {
            profileId: true,
            profileName: true,
            profilePicture: true,
          }
        }
      }
    });

    // If user not found in database
    if (!user) {
      return NextResponse.json(
        { 
          error: "User not found in database",
          message: "Please call /api/auth/sync-user to create your account"
        },
        { status: 404 }
      );
    }

    // Return user profile (safe fields only, no password)
    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        supabaseUserId: user.supabaseUserId,
        provider: user.provider,
        role: user.role,
        tutorialDone: user.tutorialDone,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        profiles: user.profiles,
      }
    });

  } catch (error: any) {
    console.error("Error getting user profile:", error);

    // Handle auth errors
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


