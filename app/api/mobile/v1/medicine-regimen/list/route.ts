// app/api/mobile/v1/medicine-regimen/list/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { listMedicineRegimens } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";

// GET /api/mobile/v1/medicine-regimen/list?profileId=...
export async function GET(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const url = new URL(request.url);
      const profileIdStr = url.searchParams.get("profileId");
      const profileId = Number(profileIdStr) || null;

      if (!profileId) {
        return NextResponse.json({ error: "profileId query param is required" }, { status: 400 });
      }

      const result = await listMedicineRegimens({
        userId: prismaUser.userId,
        profileId,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
      console.error("Error listing medicine regimens:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}


