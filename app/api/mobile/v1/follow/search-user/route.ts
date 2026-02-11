// app/api/mobile/v1/follow/search-user/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { searchUser } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/follow/search-user?query=...
// Search for users by partial email match
export async function GET(request: Request) {
    return withAuth(request, async () => {
        try {
            const url = new URL(request.url);
            const query = url.searchParams.get("query");

            if (!query) {
                return NextResponse.json(
                    { error: "query param is required" },
                    { status: 400 }
                );
            }

            const result = await searchUser(query);
            return NextResponse.json(result, { status: 200 });
        } catch (error: unknown) {
            console.error("Error searching user:", error);

            if (error instanceof ServiceError) {
                return NextResponse.json(error.body, { status: error.statusCode });
            }

            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}
