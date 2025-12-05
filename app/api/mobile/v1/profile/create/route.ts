import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { createProfileForUser } from "@/server/profile/profiles.service";

export async function POST(request: Request) {
    return withAuth(request, async ({ prismaUser}) => {
        try {
            const body = await request.json();

            const result = await createProfileForUser({
                userId: prismaUser.userId,
                body,
            });

            return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
      console.error("Error creating profile:", error);

      if (error?.statusCode && error?.body) {
        // ServiceError style
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}