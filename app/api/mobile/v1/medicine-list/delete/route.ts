// app/api/mobile/v1/medicine-list/delete/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { deleteMedicineListItem } from "@/server/medicineList/medicineList.service";
import { ServiceError } from "@/server/common/errors";

// DELETE /api/mobile/v1/medicine-list/delete
export async function DELETE(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const contentType = request.headers.get("content-type") || "";

      let mediListId: number | null = null;

      // Handle JSON body
      if (contentType.includes("application/json")) {
        const body = await request.json();
        mediListId = Number(body.mediListId) || null;
      }
      // Handle form-data
      else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        mediListId = Number(formData.get("mediListId")) || null;
      } else {
        return NextResponse.json(
          { error: "Content-Type must be application/json or multipart/form-data" },
          { status: 400 }
        );
      }

      if (!mediListId) {
        return NextResponse.json({ error: "mediListId is required" }, { status: 400 });
      }

      const result = await deleteMedicineListItem({
        userId: prismaUser.userId,
        mediListId,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
      console.error("Error deleting medicine list item:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}


