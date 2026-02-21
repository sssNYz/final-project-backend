import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordResetToken } from "@/server/auth/auth-v2.service";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    let redirectTo = searchParams.get("redirect_to");

    // Default redirect to admin site if not provided
    if (!redirectTo) {
        redirectTo = process.env.ADMIN_URL || "https://admin.medi-buddy.xyz";
    }

    if (!token) {
        return NextResponse.redirect(`${redirectTo}?error=missing_token`);
    }

    try {
        // Validate the token (checks existence and expiry)
        await verifyPasswordResetToken(token);

        // Token is valid! Redirect to the target URL with the token in the query params.
        // E.g., com.example.medibuddy://login-callback?token=abc...
        // Or, https://admin.medi-buddy.xyz/forgot-password?token=abc...

        // Handle existing query params on the redirect URL
        const redirectUrl = new URL(redirectTo);
        redirectUrl.searchParams.set("token", token);

        return NextResponse.redirect(redirectUrl.toString());
    } catch (error: any) {
        console.error("[AuthV2] Verify Reset Token Error:", error);

        const errorMsg = error.error || "invalid_token";

        // Redirect but securely pass the error so the frontend can display it
        const redirectUrl = new URL(redirectTo);
        redirectUrl.searchParams.set("error", errorMsg);

        return NextResponse.redirect(redirectUrl.toString());
    }
}
