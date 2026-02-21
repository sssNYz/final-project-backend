import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/server/auth/auth-v2.service";
import { z } from "zod";

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const parseResult = resetPasswordSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: "VALIDATION_ERROR",
                    details: parseResult.error.format(),
                },
                { status: 400 }
            );
        }

        const { token, newPassword } = parseResult.data;

        // Process request
        const result = await resetPassword(token, newPassword);

        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error("[AuthV2] Password Reset Error:", error);

        const status = error.statusCode || 400; // Default to 400 client error for invalid tokens
        const payload = {
            error: error.error || "RESET_FAILED",
            message: error.message || "Failed to reset password. The link might be expired or invalid.",
        };

        return NextResponse.json(payload, { status });
    }
}
