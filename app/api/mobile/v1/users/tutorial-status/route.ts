import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateCurrentUserProfile } from "@/server/users/users.service";
import { ServiceError } from "@/server/common/errors";

/**
 * PATCH /api/mobile/v1/users/tutorial-status
 * Updates the tutorial status (tutorialDone) for the current user.
 * Body should be { "tutorialDone": boolean }
 */
export async function PATCH(request: Request) {
    try {
        // Verify user token
        const jwtPayload = await requireAuth(request);

        // Parse request body
        const body = await request.json();

        if (typeof body.tutorialDone !== "boolean") {
            return NextResponse.json(
                { error: "tutorialDone must be a boolean value" },
                { status: 400 }
            );
        }

        // Call service to update
        const result = await updateCurrentUserProfile({
            userId: jwtPayload.userId,
            body: { tutorialDone: body.tutorialDone },
        });

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error("Error setting tutorial status:", error);

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

/**
 * POST /api/mobile/v1/users/tutorial-status
 */
export async function POST(request: Request) {
    return PATCH(request);
}
