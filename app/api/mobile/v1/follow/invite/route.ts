// app/api/mobile/v1/follow/invite/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { sendInvite } from "@/server/follow/follow.service";
import { ServiceError } from "@/server/common/errors";

// POST /api/mobile/v1/follow/invite
// Send an invite to another user by email
export async function POST(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const contentType = request.headers.get("content-type") || "";

            let email = "";
            let name: string | undefined;
            let accountPicture: string | undefined;
            let accountPictureFile: { buffer: Buffer; originalFilename: string } | null = null;
            let profileIds: number[] | null = null;

            if (contentType.includes("multipart/form-data")) {
                const formData = await request.formData();
                email = (formData.get("email") as string) || "";
                name = (formData.get("name") as string) || undefined;

                // check for file or string
                const rawPicture = formData.get("accountPicture");
                if (rawPicture instanceof File) {
                    const arrayBuffer = await rawPicture.arrayBuffer();
                    accountPictureFile = {
                        buffer: Buffer.from(arrayBuffer),
                        originalFilename: rawPicture.name
                    };
                } else if (typeof rawPicture === "string") {
                    accountPicture = rawPicture || undefined;
                }

                // profileIds: try to parse from string if present
                const rawProfileIds = formData.get("profileIds");
                if (rawProfileIds && typeof rawProfileIds === "string") {
                    try {
                        profileIds = JSON.parse(rawProfileIds);
                    } catch {
                        // ignore invalid json
                    }
                }
            } else {
                const body = await request.json();
                email = body.email;
                profileIds = body.profileIds;
                name = body.name;
                accountPicture = body.accountPicture;
            }

            if (!email || typeof email !== "string") {
                return NextResponse.json(
                    { error: "email is required" },
                    { status: 400 }
                );
            }

            const result = await sendInvite({
                ownerUserId: prismaUser.userId,
                email,
                profileIds: profileIds ?? null,
                name,
                accountPicture,
                accountPictureFile
            });

            return NextResponse.json(result, { status: 201 });
        } catch (error: unknown) {
            console.error("Error sending invite:", error);

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
