import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken, extractBearerToken } from "@/lib/jwt";
import { comparePassword } from "@/lib/password";
import { Role } from "@prisma/client";

/**
 * POST /api/admin/v2/auth/verify-action
 * Verifies admin password for critical actions
 */
export async function POST(request: Request) {
    try {
        // 1. Verify Token
        const token = extractBearerToken(request);

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized", message: "No token provided" },
                { status: 401 }
            );
        }

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch (e) {
            return NextResponse.json(
                { error: "Unauthorized", message: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // 2. Check Role
        if (payload.role !== Role.Admin && payload.role !== Role.SuperAdmin) {
            return NextResponse.json(
                { error: "Forbidden", message: "Admin access required" },
                { status: 403 }
            );
        }

        // 3. Get Password from Body
        const body = await request.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json(
                { error: "Bad Request", message: "Password is required" },
                { status: 400 }
            );
        }

        // 4. Fetch User (to get hashed password)
        const user = await prisma.userAccount.findUnique({
            where: { userId: payload.userId },
        });

        if (!user || !user.password) {
            return NextResponse.json(
                { error: "Not Found", message: "User not found or has no password" },
                { status: 404 }
            );
        }

        // 5. Compare Password
        const isValid = await comparePassword(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                { error: "Bad Request", message: "Invalid password" },
                { status: 400 }
            );
        }

        // 6. Return Confirmation
        return NextResponse.json(
            { success: true, message: "Use Data Confirm" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error verifying admin action:", error);
        return NextResponse.json(
            { error: "Internal Server Error", message: "Something went wrong" },
            { status: 500 }
        );
    }
}
