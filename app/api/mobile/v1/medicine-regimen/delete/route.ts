// app/api/mobile/v1/medicine-regimen/delete/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { deleteMedicineRegimen } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";

// DELETE /api/mobile/v1/medicine-regimen/delete
export async function DELETE(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const url = new URL(request.url);
      const mediRegimenIdStr = url.searchParams.get("mediRegimenId");
      const mediRegimenId = Number(mediRegimenIdStr) || null;

      if (!mediRegimenId) {
        return NextResponse.json({ error: "mediRegimenId query param is required" }, { status: 400 });
      }

      const result = await deleteMedicineRegimen({
        userId: prismaUser.userId,
        mediRegimenId,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
      console.error("Error deleting medicine regimen:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

