import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers"; //for check permission and authentication
import { createProfileForUser } from "@/server/profile/profiles.service";

export async function POST(request: Request) {
    return withAuth(request, async ({ prismaUser }) => {
        try {
            const contentType = request.headers.get("content-type") || "";

            let profileName: string | null = null;
            let profilePictureFile: { buffer: Buffer; originalFilename: string } | null = null;
            let profilePictureUrl: string | null = null;

            // Handle JSON body (for testing with URLs)
            if (contentType.includes("application/json")) {
                const body = await request.json();
                profileName = body.profileName || null;
                profilePictureUrl = body.profilePicture || null;
            }
            // Handle form-data (for file uploads)
            else if (contentType.includes("multipart/form-data")) {
                const formData = await request.formData();
                profileName = (formData.get("profileName") as string) || null;
                
                const file = formData.get("file") as File | null;
                if (file) {
                    const arrayBuffer = await file.arrayBuffer();
                    profilePictureFile = {
                        buffer: Buffer.from(arrayBuffer),
                        originalFilename: file.name,
                    };
                }
                
                profilePictureUrl = (formData.get("profilePicture") as string) || null;
            } else {
                return NextResponse.json(
                    { error: "Content-Type must be application/json or multipart/form-data" },
                    { status: 400 }
                );
            }

            if (!profileName) {
                return NextResponse.json(
                    { error: "profileName is required" },
                    { status: 400 }
                );
            }
            //call service to create profile
            const result = await createProfileForUser({
                userId: prismaUser.userId,
                profileName,
                profilePictureFile: profilePictureFile || null,
                profilePictureUrl: profilePictureUrl || null,
            });

            return NextResponse.json(result, { status: 201 });
        } catch (error: any) {
            console.error("Error creating profile:", error);

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