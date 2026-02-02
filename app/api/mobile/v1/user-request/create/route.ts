// app/api/mobile/v1/user-request/create/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { createUserRequestForMobile } from "@/server/userRequest/userRequest.service";
import { ServiceError } from "@/server/common/errors";

export const runtime = "nodejs";

// POST /api/mobile/v1/user-request/create
export async function POST(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const contentType = request.headers.get("content-type") || "";

      let requestType: string = "";
      let requestTitle: string = "";
      let requestDetails: string = "";
      let pictureFile: { buffer: Buffer; originalFilename: string; mimeType: string } | null = null;

      // Handle JSON body
      if (contentType.includes("application/json")) {
        const body = await request.json();
        requestType = body.requestType ?? "";
        requestTitle = body.requestTitle ?? "";
        requestDetails = body.requestDetails ?? "";
      }
      // Handle form-data (for file uploads)
      else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        requestType = (formData.get("requestType") as string) ?? "";
        requestTitle = (formData.get("requestTitle") as string) ?? "";
        requestDetails = (formData.get("requestDetails") as string) ?? "";

        const file = formData.get("picture") as File | null;
        if (file && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          pictureFile = {
            buffer: Buffer.from(arrayBuffer),
            originalFilename: file.name,
            mimeType: file.type,
          };
        }
      } else {
        return NextResponse.json(
          { error: "Content-Type must be application/json or multipart/form-data" },
          { status: 400 }
        );
      }

      const result = await createUserRequestForMobile({
        userId: prismaUser.userId,
        requestType,
        requestTitle,
        requestDetails,
        pictureFile,
      });

      return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
      console.error("Error creating user request:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
