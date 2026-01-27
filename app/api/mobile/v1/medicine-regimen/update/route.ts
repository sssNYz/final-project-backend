// app/api/mobile/v1/medicine-regimen/update/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { updateMedicineRegimen } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";
import { ScheduleType, MealRelation } from "@prisma/client";
import { MedicineRegimenUpdateBodySchema } from "@/server/medicineRegimen/medicineRegimen.schemas";
import type { ZodError } from "zod";

function firstZodIssue(error: ZodError): string {
  const issue = error.issues?.[0];
  if (!issue) return "Invalid request body";
  const path = issue.path?.length ? issue.path.map(String).join(".") : "";
  return path ? `${path}: ${issue.message}` : issue.message;
}

// PATCH /api/mobile/v1/medicine-regimen/update
export async function PATCH(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const json = await request.json();
      const parsed = MedicineRegimenUpdateBodySchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json({ error: firstZodIssue(parsed.error) }, { status: 400 });
      }
      const body = parsed.data;

      // Build update data
      const updateData: {
        scheduleType?: ScheduleType;
        startDate?: Date;
        endDate?: Date | null;
        daysOfWeek?: string | null;
        intervalDays?: number | null;
        cycleOnDays?: number | null;
        cycleBreakDays?: number | null;
        times?: Array<{
          time: string;
          dose: number;
          unit: string;
          mealRelation: MealRelation;
          mealOffsetMin?: number | null;
        }>;
      } = {};

      if (body.scheduleType !== undefined) {
        updateData.scheduleType = body.scheduleType as ScheduleType;
      }

      if (body.startDate !== undefined) {
        updateData.startDate = body.startDate;
      }

      if (body.endDate !== undefined) {
        updateData.endDate = body.endDate;
      }

      if (body.daysOfWeek !== undefined) {
        updateData.daysOfWeek = body.daysOfWeek ?? null;
      }

      if (body.intervalDays !== undefined) {
        updateData.intervalDays = body.intervalDays;
      }

      if (body.cycleOnDays !== undefined) {
        updateData.cycleOnDays = body.cycleOnDays;
      }

      if (body.cycleBreakDays !== undefined) {
        updateData.cycleBreakDays = body.cycleBreakDays;
      }

      if (body.times !== undefined) {
        updateData.times = body.times.map((t) => ({
          time: t.time,
          dose: t.dose,
          unit: t.unit,
          mealRelation: t.mealRelation as MealRelation,
          mealOffsetMin: t.mealOffsetMin ?? null,
        }));
      }

      const result = await updateMedicineRegimen({
        userId: prismaUser.userId,
        mediRegimenId: body.mediRegimenId,
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

