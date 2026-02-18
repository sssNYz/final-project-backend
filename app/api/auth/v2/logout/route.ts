import { NextResponse } from "next/server";
import { logoutUser } from "@/server/auth/auth-v2.service";
import { ServiceError } from "@/server/common/errors";

/**
 * POST /api/auth/v2/logout
 * Revoke a refresh token (invalidate session)
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { refreshToken } = body;

        if (!refreshToken) {
            return NextResponse.json(
                { error: "refreshToken is required" },
                { status: 400 }
            );
        }

        const result = await logoutUser(refreshToken);

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error("Error in V2 logout:", error);

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
