import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";

/**
 * POST /api/auth/v2/login
 * Authenticate with email + password, returns access + refresh tokens
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate
        if (!email || !password) {
            return NextResponse.json(
                { error: "email and password are required" },
                { status: 400 }
            );
        }

        const result = await loginUser({ email, password });

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error("Error in V2 login:", error);

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
