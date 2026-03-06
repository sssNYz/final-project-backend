import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/auth/auth-v2.service";
import { validateEmailWithAbstract } from "@/server/common/email-validation";
import { z } from "zod";

const requestResetSchema = z.object({
    email: z.string().email("Invalid email address"),
    redirectTo: z.string().url("Invalid redirect URL").min(1, "Redirect URL is required"),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const parseResult = requestResetSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: "VALIDATION_ERROR",
                    details: parseResult.error.format(),
                },
                { status: 400 }
            );
        }

        const { email, redirectTo } = parseResult.data;

        // Verify with Abstract API
        const validationResult = await validateEmailWithAbstract(email);
        if (!validationResult.isValid) {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: validationResult.message || "Invalid email address" },
                { status: 400 }
            );
        }

        // Process request
        const result = await requestPasswordReset(email, redirectTo);

        if ("error" in result) {
            return NextResponse.json(result, { status: 404 });
        }

        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error("[AuthV2] Password Reset Request Error:", error);

        // Assume any thrown ServiceError is handled via global error middleware or handled here
        // If your codebase has a standard error handler, use that. Otherwise, generic 500 or 400.
        const status = error.statusCode || 500;
        const payload = {
            error: error.error || "INTERNAL_SERVER_ERROR",
            message: error.message || "An unexpected error occurred",
        };

        return NextResponse.json(payload, { status });
    }
}
