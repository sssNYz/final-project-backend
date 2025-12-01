/**
 * EXAMPLE: Admin-Only API Route with Role-Based Authentication
 * 
 * This shows how to restrict endpoints to specific roles.
 * DELETE THIS FILE when you understand how to use it.
 */

import { NextResponse } from "next/server";
import { withRole } from "@/lib/apiHelpers";

/**
 * Example admin-only endpoint
 * Only users with "Admin" or "SuperAdmin" role can access this
 */
export async function GET(request: Request) {
  return withRole(request, "Admin", async (context) => {
    const { prismaUser } = context;
    
    // This code only runs if user has Admin or SuperAdmin role
    // Regular users will get a 403 Forbidden error
    
    return NextResponse.json({
      message: "Welcome, admin!",
      admin: {
        userId: prismaUser.userId,
        email: prismaUser.email,
        role: prismaUser.role,
      }
    });
  });
}

/**
 * Example super-admin-only endpoint
 * Only "SuperAdmin" role can access this
 */
export async function POST(request: Request) {
  return withRole(request, "SuperAdmin", async (context) => {
    const { prismaUser } = context;
    
    // Only SuperAdmin can access this
    
    return NextResponse.json({
      message: "Super admin access granted",
      superAdmin: prismaUser.email
    });
  });
}






