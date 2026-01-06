// app/api/mobile/v1/medicine-regimen/create/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { createMedicineRegimen } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";
import { ScheduleType, MealRelation } from "@prisma/client";

// POST /api/mobile/v1/medicine-regimen/create
export async function POST(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.mediListId) {
        return NextResponse.json({ error: "mediListId is required" }, { status: 400 });
      }
      if (!body.scheduleType) {
        return NextResponse.json({ error: "scheduleType is required" }, { status: 400 });
      }
      if (!body.startDate) {
        return NextResponse.json({ error: "startDate is required" }, { status: 400 });
      }
      if (!body.times || !Array.isArray(body.times) || body.times.length === 0) {
        return NextResponse.json({ error: "times array with at least one time is required" }, { status: 400 });
      }

      // Parse dates
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
      }

      const endDate = body.endDate ? new Date(body.endDate) : null;
      if (endDate && isNaN(endDate.getTime())) {
        return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
      }

      // Validate scheduleType enum
      if (!["DAILY", "WEEKLY", "INTERVAL", "CYCLE"].includes(body.scheduleType)) {
        return NextResponse.json({ error: "scheduleType must be one of: DAILY, WEEKLY, INTERVAL, CYCLE" }, { status: 400 });
      }

      const result = await createMedicineRegimen({
        userId: prismaUser.userId,
        mediListId: Number(body.mediListId),
        scheduleType: body.scheduleType as ScheduleType,
        startDate,
        endDate,
        daysOfWeek: body.daysOfWeek ?? null,
        intervalDays: body.intervalDays ?? null,
        cycleOnDays: body.cycleOnDays ?? null,
        cycleBreakDays: body.cycleBreakDays ?? null,
        times: body.times.map((t: any) => ({
          time: t.time,
          dose: Number(t.dose),
          unit: t.unit,
          mealRelation: t.mealRelation as MealRelation,
          mealOffsetMin: t.mealOffsetMin ?? null,
        })),
      });

      return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
      console.error("Error creating medicine regimen:", error);

      if (error instanceof ServiceError) {
        return NextResponse.json(error.body, { status: error.statusCode });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

