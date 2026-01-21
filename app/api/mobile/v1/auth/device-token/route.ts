import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { saveDeviceToken } from "@/server/deviceTokens/deviceTokens.service";
import { ServiceError } from "@/server/common/errors";

export const runtime = "nodejs";

/**
 * GET /api/mobile/v1/auth/device-token
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    message: "API Usage Information",
    endpoint: "/api/mobile/v1/auth/device-token",
    method: "POST",
    description: "Save or update a device FCM token for push notifications. One user can have many tokens (phone, tablet, emulator).",
    requiredHeaders: {
      "Authorization": "Bearer <supabase_access_token>",
      "Content-Type": "application/json"
    },
    requiredBody: {
      token: "string (required) - FCM device token from Firebase",
    },
    optionalBody: {
      platform: "string (optional) - 'android', 'ios', or 'web'",
      deviceId: "string (optional) - device identifier from app"
    },
    exampleRequest: {
      method: "POST",
      headers: {
        "Authorization": "Bearer your_supabase_access_token",
        "Content-Type": "application/json"
      },
      body: {
        token: "fcm_token_here...",
        platform: "android",
        deviceId: "my-device-123"
      }
    },
    possibleResponses: {
      "200": "Token saved or updated successfully",
      "400": "Invalid token or request body",
      "401": "Unauthorized - Invalid or missing token",
      "404": "User not found (sync-user not called yet)",
      "500": "Internal server error"
    }
  }, { status: 200 });
}

/**
 * POST /api/mobile/v1/auth/device-token
 * Save or update a device FCM token for the authenticated user
 */
export async function POST(request: Request) {
  try {
    // Verify Supabase token
    const supabaseUser = await requireAuth(request);

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const record = (body ?? {}) as Record<string, unknown>;
    const token = record.token;
    const platform = record.platform;
    const deviceId = record.deviceId;

    // Validate token
    if (typeof token !== "string") {
      return NextResponse.json(
        { error: "token is required and must be a string" },
        { status: 400 }
      );
    }

    // Call service
    const result = await saveDeviceToken({
      supabaseUser,
      token,
      platform: typeof platform === "string" ? platform : null,
      deviceId: typeof deviceId === "string" ? deviceId : null,
    });

    return NextResponse.json(
      {
        message: result.message,
        deviceToken: {
          deviceTokenId: result.deviceToken.deviceTokenId,
          token: result.deviceToken.token,
          platform: result.deviceToken.platform,
          deviceId: result.deviceToken.deviceId,
          lastSeenAt: result.deviceToken.lastSeenAt,
        },
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("Error saving device token:", error);

    // Handle auth errors
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing token" },
        { status: 401 }
      );
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(error.body, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
