import { NextResponse } from "next/server";
import { createAdminUser } from "@/server/auth/auth-v2.service";
import { verifyAccessToken, extractBearerToken } from "@/lib/jwt";
import { ServiceError } from "@/server/common/errors";
import { Role } from "@prisma/client";

/**
 * POST /api/admin/v2/admins
 * Create a new Admin user.
 * Restricted to SuperAdmin only.
 */
export async function POST(request: Request) {
    try {
        // 1. Verify Token
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json(
                { error: "UNAUTHORIZED", message: "No token provided" },
                { status: 401 }
            );
        }

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch (e) {
            return NextResponse.json(
                { error: "UNAUTHORIZED", message: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // 2. Check Role (Admin or SuperAdmin)
        if (payload.role !== "Admin" && payload.role !== "SuperAdmin") {
            return NextResponse.json(
                { error: "FORBIDDEN", message: "Only Admins can perform this action" },
                { status: 403 }
            );
        }

        // 3. Parse Body
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "Email and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // 4. Call Service
        const result = await createAdminUser({
            email,
            password,
            creatorRole: payload.role,
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }
        console.error("[Create Admin] Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
