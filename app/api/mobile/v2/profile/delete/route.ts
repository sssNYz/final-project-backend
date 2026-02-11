
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { deleteProfileForUserV2 } from "@/server/profile/profiles.service";

// DELETE /api/mobile/v2/profile/delete
export async function DELETE(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            // Parse JSON body
            // Note: DELETE requests with body are allowed in HTTP specs but sometimes stripped by proxies.
            // Assuming this environment supports it. If not, we might need a POST "action" endpoint.
            // But standard REST often uses DELETE with body for complex deletions.

            const contentType = request.headers.get("content-type") || "";
            let body: any = {};

            if (contentType.includes("application/json")) {
                try {
                    body = await request.json();
                } catch (e) {
                    return NextResponse.json(
                        { error: "Invalid JSON body" },
                        { status: 400 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: "Content-Type must be application/json" },
                    { status: 400 }
                );
            }

            const { profileId, confirmation } = body;

            if (!profileId) {
                return NextResponse.json(
                    { error: "profileId is required" },
                    { status: 400 }
                );
            }

            if (!confirmation) {
                return NextResponse.json(
                    { error: "confirmation string is required" },
                    { status: 400 }
                );
            }

            const result = await deleteProfileForUserV2({
                userId: prismaUser.userId, // Authenticated user
                profileId: Number(profileId),
                confirmation: String(confirmation),
            });

            return NextResponse.json(result, { status: 200 });

        } catch (error: any) {
            console.error("Error deleting profile (v2):", error);

            if (error?.statusCode && error?.body) {
                return NextResponse.json(error.body, { status: error.statusCode });
            }

            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}
