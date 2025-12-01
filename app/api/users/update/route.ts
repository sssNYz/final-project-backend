import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

const prisma = new PrismaClient();

/**
 * PATCH /api/users/update
 * Update the current authenticated user's profile
 * Only allows updating safe fields (not email, password, supabaseUserId, provider)
 */
export async function PATCH(request: Request) {
  try {
    // Verify Supabase token
    const supabaseUser = await requireAuth(request);

    // Find user in Prisma database
    const user = await prisma.userAccount.findFirst({
      where: {
        OR: [
          { supabaseUserId: supabaseUser.id },
          { email: supabaseUser.email }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { 
          error: "User not found in database",
          message: "Please call /api/auth/sync-user to create your account"
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Define allowed fields to update
    const allowedFields = ["tutorialDone"];
    const updateData: any = {};

    // Only include allowed fields in update
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update", allowedFields },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.userAccount.update({
      where: { userId: user.userId },
      data: updateData,
    });

    // Return updated user profile (safe fields only)
    return NextResponse.json({
      message: "User updated successfully",
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        supabaseUserId: updatedUser.supabaseUserId,
        provider: updatedUser.provider,
        role: updatedUser.role,
        tutorialDone: updatedUser.tutorialDone,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
      }
    });

  } catch (error: any) {
    console.error("Error updating user:", error);

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

/**
 * POST /api/users/update (alternative to PATCH)
 */
export async function POST(request: Request) {
  return PATCH(request);
}


