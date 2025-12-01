import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "./auth";
import { User } from "@supabase/supabase-js";

const prisma = new PrismaClient();

/**
 * Interface for authenticated user context
 * Contains both Supabase user and Prisma UserAccount
 */
export interface AuthenticatedUserContext {
  supabaseUser: User;
  prismaUser: {
    userId: number;
    email: string;
    supabaseUserId: string | null;
    provider: string | null;
    role: string;
    tutorialDone: boolean;
    lastLogin: Date | null;
    createdAt: Date;
  };
}

/**
 * Wrapper for API routes that require authentication
 * Automatically verifies Supabase token and loads Prisma user
 * 
 * @example
 * export async function GET(request: Request) {
 *   return withAuth(request, async (context) => {
 *     const { prismaUser } = context;
 *     // Your endpoint logic here
 *     return NextResponse.json({ data: "something" });
 *   });
 * }
 */
export async function withAuth(
  request: Request,
  handler: (context: AuthenticatedUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Verify Supabase token
    const supabaseUser = await requireAuth(request);

    // Find user in Prisma database
    const prismaUser = await prisma.userAccount.findFirst({
      where: {
        OR: [
          { supabaseUserId: supabaseUser.id },
          { email: supabaseUser.email }
        ]
      },
      select: {
        userId: true,
        email: true,
        supabaseUserId: true,
        provider: true,
        role: true,
        tutorialDone: true,
        lastLogin: true,
        createdAt: true,
      }
    });

    if (!prismaUser) {
      return NextResponse.json(
        { 
          error: "User not found in database",
          message: "Please call /api/auth/sync-user to create your account"
        },
        { status: 404 }
      );
    }

    // Call the handler with authenticated context
    return await handler({ supabaseUser, prismaUser });

  } catch (error: any) {
    console.error("Error in withAuth:", error);

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
 * Helper to check if user has a specific role
 */
export function hasRole(userRole: string, requiredRole: "SuperAdmin" | "Admin" | "User"): boolean {
  const roleHierarchy = ["User", "Admin", "SuperAdmin"];
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Wrapper for API routes that require a specific role
 * 
 * @example
 * export async function POST(request: Request) {
 *   return withRole(request, "Admin", async (context) => {
 *     // Only admins can access this
 *     return NextResponse.json({ success: true });
 *   });
 * }
 */
export async function withRole(
  request: Request,
  requiredRole: "SuperAdmin" | "Admin" | "User",
  handler: (context: AuthenticatedUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    if (!hasRole(context.prismaUser.role, requiredRole)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      );
    }
    
    return await handler(context);
  });
}


