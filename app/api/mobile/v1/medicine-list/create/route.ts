// app/api/mobile/v1/medicine-list/create/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { createMedicineListItem } from "@/server/medicineList/medicineList.service";
import { ServiceError } from "@/server/common/errors";

// POST /api/mobile/v1/medicine-list/create
export async function POST(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const contentType = request.headers.get("content-type") || "";

      let profileId: number | null = null;
      let mediId: number | null = null;
      let mediNickname: string | null = null;
      let pictureFile: { buffer: Buffer; originalFilename: string } | null = null;

      // Handle JSON body (for testing)
      if (contentType.includes("application/json")) {
        const body = await request.json();
        profileId = Number(body.profileId) || null;
        mediId = Number(body.mediId) || null;
        mediNickname = body.mediNickname ?? null;
      }
      // Handle form-data (for file uploads)
      else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        profileId = Number(formData.get("profileId")) || null;
        mediId = Number(formData.get("mediId")) || null;
        mediNickname = (formData.get("mediNickname") as string) ?? null;

        const file = formData.get("picture") as File | null;
        if (file && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          pictureFile = {
            buffer: Buffer.from(arrayBuffer),
            originalFilename: file.name,
          };
        }
      } else {
        return NextResponse.json(
          { error: "Content-Type must be application/json or multipart/form-data" },
          { status: 400 }
        );
      }

      // Validate required fields
      if (!profileId) {
        return NextResponse.json({ error: "profileId is required" }, { status: 400 });
      }
      if (!mediId) {
        return NextResponse.json({ error: "mediId is required" }, { status: 400 });
      }

      const result = await createMedicineListItem({
        userId: prismaUser.userId,
        profileId,
        mediId,
        mediNickname,
        pictureFile,
      });

      return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
      console.error("Error creating medicine list item:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}




