import { NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken, AccessTokenPayload } from "./jwt";
import { prisma } from "@/lib/prisma";

/**
 * V2 Authenticated user context (no Supabase dependency)
 */
export interface AuthenticatedUserContextV2 {
    tokenPayload: AccessTokenPayload;
    prismaUser: {
        userId: number;
        email: string;
        provider: string | null;
        role: string;
        tutorialDone: boolean;
        lastLogin: Date | null;
        createdAt: Date;
    };
}

/**
 * V2 Auth Wrapper – verifies our own JWT (not Supabase)
 * Drop-in replacement for the existing `withAuth` from apiHelpers.ts
 *
 * @example
 * export async function GET(request: Request) {
 *   return withAuthV2(request, async ({ prismaUser }) => {
 *     return NextResponse.json({ data: prismaUser });
 *   });
 * }
 */
export async function withAuthV2(
    request: Request,
    handler: (context: AuthenticatedUserContextV2) => Promise<NextResponse>
): Promise<NextResponse> {
    try {
        // 1. Extract Bearer token
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized – missing Bearer token" },
                { status: 401 }
            );
        }

        // 2. Verify JWT
        let payload: AccessTokenPayload;
        try {
            payload = verifyAccessToken(token);
        } catch {
            return NextResponse.json(
                { error: "Unauthorized – invalid or expired token" },
                { status: 401 }
            );
        }

        // 3. Load user from database
        const prismaUser = await prisma.userAccount.findUnique({
            where: { userId: payload.userId },
            select: {
                userId: true,
                email: true,
                provider: true,
                role: true,
                status: true,
                tutorialDone: true,
                lastLogin: true,
                createdAt: true,
            },
        });

        if (!prismaUser) {
            return NextResponse.json(
                { error: "User not found in database" },
                { status: 404 }
            );
        }

        if (prismaUser.status === false) {
            return NextResponse.json(
                {
                    error: "Account banned",
                    message: "Your account has been suspended. Please contact support.",
                },
                { status: 403 }
            );
        }

        // 4. Call handler
        return await handler({ tokenPayload: payload, prismaUser });
    } catch (error: unknown) {
        console.error("Error in withAuthV2:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * V2 Role-protected wrapper
 */
export async function withRoleV2(
    request: Request,
    requiredRole: "SuperAdmin" | "Admin" | "User",
    handler: (context: AuthenticatedUserContextV2) => Promise<NextResponse>
): Promise<NextResponse> {
    return withAuthV2(request, async (context) => {
        const roleHierarchy = ["User", "Admin", "SuperAdmin"];
        const userRoleIndex = roleHierarchy.indexOf(context.prismaUser.role);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

        if (userRoleIndex < requiredRoleIndex) {
            return NextResponse.json(
                { error: "Forbidden – insufficient permissions" },
                { status: 403 }
            );
        }

        return await handler(context);
    });
}
