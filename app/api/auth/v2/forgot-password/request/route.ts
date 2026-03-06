import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/auth/auth-v2.service";
import { validateEmailWithAbstract } from "@/server/common/email-validation";
import { ServiceError } from "@/server/common/errors";
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

        if (error instanceof ServiceError) {
            return NextResponse.json(error.body, { status: error.statusCode });
        }

        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
