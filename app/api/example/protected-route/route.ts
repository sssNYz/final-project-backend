/**
 * EXAMPLE: Protected API Route with Authentication
 * 
 * This is a template showing how to create authenticated endpoints.
 * Copy this pattern for your business logic endpoints.
 * 
 * DELETE THIS FILE when you understand how to use it.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";

/**
 * Example GET endpoint with authentication
 * Try it: GET /api/example/protected-route
 * With header: Authorization: Bearer <your_supabase_token>
 */
export async function GET(request: Request) {
  return withAuth(request, async (context) => {
    const { prismaUser, supabaseUser } = context;
    
    // You now have access to:
    // - prismaUser.userId (use this for database queries)
    // - prismaUser.email
    // - prismaUser.role
    // - prismaUser.tutorialDone
    // - supabaseUser.id (Supabase user ID)
    
    return NextResponse.json({
      message: "This is a protected endpoint!",
      user: {
        userId: prismaUser.userId,
        email: prismaUser.email,
        role: prismaUser.role,
      }
    });
  });
}

/**
 * Example POST endpoint with authentication
 */
export async function POST(request: Request) {
  return withAuth(request, async (context) => {
    const { prismaUser } = context;
    
    // Parse request body
    const body = await request.json();
    
    // Your business logic here
    // For example: Create a medication log for this user
    
    return NextResponse.json({
      message: "Data created successfully",
      userId: prismaUser.userId,
      data: body
    });
  });
}






