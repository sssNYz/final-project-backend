// app/api/mobile/v1/medicine-regimen/create/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHelpers";
import { createMedicineRegimen } from "@/server/medicineRegimen/medicineRegimen.service";
import { ServiceError } from "@/server/common/errors";
import { ScheduleType, MealRelation } from "@prisma/client";
import { MedicineRegimenCreateBodySchema } from "@/server/medicineRegimen/medicineRegimen.schemas";
import type { ZodError } from "zod";

function firstZodIssue(error: ZodError): string {
  const issue = error.issues?.[0];
  if (!issue) return "Invalid request body";
  const path = issue.path?.length ? issue.path.map(String).join(".") : "";
  return path ? `${path}: ${issue.message}` : issue.message;
}

// POST /api/mobile/v1/medicine-regimen/create
export async function POST(request: Request) {
  return withAuth(request, async ({ prismaUser }) => {
    try {
      const json = await request.json();
      const parsed = MedicineRegimenCreateBodySchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json({ error: firstZodIssue(parsed.error) }, { status: 400 });
      }
      const body = parsed.data;

      const daysOfWeek = body.scheduleType === "WEEKLY" ? body.daysOfWeek : null;
      const intervalDays = body.scheduleType === "INTERVAL" ? body.intervalDays : null;
      const cycleOnDays = body.scheduleType === "CYCLE" ? body.cycleOnDays : null;
      const cycleBreakDays = body.scheduleType === "CYCLE" ? body.cycleBreakDays : null;

      const result = await createMedicineRegimen({
        userId: prismaUser.userId,
        mediListId: body.mediListId,
        scheduleType: body.scheduleType as ScheduleType,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        daysOfWeek,
        intervalDays,
        cycleOnDays,
        cycleBreakDays,
        times: body.times.map((t) => ({
          time: t.time,
          dose: t.dose,
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
