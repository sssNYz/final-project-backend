// app/api/mobile/v1/medicine-regimen/update/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { updateMedicineRegimen } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";
import { ScheduleType } from "@prisma/client";

// PATCH /api/mobile/v1/medicine-regimen/update
export async function PATCH(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const body = await request.json();

      if (!body.mediRegimenId) {
        return NextResponse.json({ error: "mediRegimenId is required" }, { status: 400 });
      }

      // Build update data
      const updateData: {
        scheduleType?: ScheduleType;
        startDate?: Date;
        endDate?: Date | null;
        daysOfWeek?: string | null;
        intervalDays?: number | null;
        cycleOnDays?: number | null;
        cycleBreakDays?: number | null;
      } = {};

      if (body.scheduleType !== undefined) {
        if (!["DAILY", "WEEKLY", "INTERVAL", "CYCLE"].includes(body.scheduleType)) {
          return NextResponse.json({ error: "scheduleType must be one of: DAILY, WEEKLY, INTERVAL, CYCLE" }, { status: 400 });
        }
        updateData.scheduleType = body.scheduleType as ScheduleType;
      }

      if (body.startDate !== undefined) {
        const startDate = new Date(body.startDate);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
        }
        updateData.startDate = startDate;
      }

      if (body.endDate !== undefined) {
        if (body.endDate === null) {
          updateData.endDate = null;
        } else {
          const endDate = new Date(body.endDate);
          if (isNaN(endDate.getTime())) {
            return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
          }
          updateData.endDate = endDate;
        }
      }

      if (body.daysOfWeek !== undefined) {
        updateData.daysOfWeek = body.daysOfWeek ?? null;
      }

      if (body.intervalDays !== undefined) {
        updateData.intervalDays = body.intervalDays !== null ? Number(body.intervalDays) : null;
      }

      if (body.cycleOnDays !== undefined) {
        updateData.cycleOnDays = body.cycleOnDays !== null ? Number(body.cycleOnDays) : null;
      }

      if (body.cycleBreakDays !== undefined) {
        updateData.cycleBreakDays = body.cycleBreakDays !== null ? Number(body.cycleBreakDays) : null;
      }

      const result = await updateMedicineRegimen({
        userId: prismaUser.userId,
        mediRegimenId: Number(body.mediRegimenId),
        ...updateData,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
      console.error("Error updating medicine regimen:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

