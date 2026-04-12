import { NextResponse } from "next/server";
import { googleLoginUser } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";
import { getRequestTimeZone } from "@/server/common/request-timezone";

/**
 * POST /api/auth/v2/google-login
 * Authenticate with Google idToken, returns access + refresh tokens
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { idToken } = body;
        const timezone = getRequestTimeZone(body, request);

        // Validate
        if (!idToken) {
            return NextResponse.json(
                { error: "idToken is required" },
                { status: 400 }
            );
        }

        const result = await googleLoginUser(idToken, timezone);

        // Create response with JSON body
        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error("Error in V2 google-login:", error);

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
