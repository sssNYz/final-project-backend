import { z } from "zod";

const scheduleTypeValues = ["DAILY", "WEEKLY", "INTERVAL", "CYCLE"] as const;
const mealRelationValues = ["BEFORE_MEAL", "AFTER_MEAL", "WITH_MEAL", "NONE"] as const;
const dayOfWeekValues = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function isValidHHMM(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hStr, mStr] = value.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

const DaysOfWeekInputSchema = z
  .union([
    z.string().trim().min(1),
    z.array(z.coerce.number().int().min(0).max(6)).min(1),
    z.array(z.enum(dayOfWeekValues)).min(1),
  ])
  .transform((value) => {
    if (typeof value === "string") return value;
    const mapped = value.map((v) => {
      if (typeof v === "number") return v;
      return dayOfWeekValues.indexOf(v);
    });
    return mapped.join(",");
  });

export const MedicineRegimenTimeInputSchema = z
  .object({
    time: z.string().refine(isValidHHMM, { message: "time must be in HH:MM format (00:00-23:59)" }),
    dose: z.coerce.number().int().min(1),
    unit: z.string().trim().min(1),
    mealRelation: z.enum(mealRelationValues),
    mealOffsetMin: z.coerce.number().int().min(0).nullable().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.mealRelation === "NONE") {
      if (val.mealOffsetMin !== null && val.mealOffsetMin !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["mealOffsetMin"],
          message: "mealOffsetMin must be null or omitted when mealRelation is NONE",
        });
      }
      return;
    }

    if (val.mealOffsetMin === null || val.mealOffsetMin === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["mealOffsetMin"],
        message: "mealOffsetMin is required when mealRelation is not NONE",
      });
    }
  });

const commonCreateFields = {
  mediListId: z.coerce.number().int().positive(),
  startDate: z.coerce.date(),
  times: z.array(MedicineRegimenTimeInputSchema).min(1),
} as const;

const MedicineRegimenCreateDailySchema = z
  .object({
    ...commonCreateFields,
    scheduleType: z.literal("DAILY"),
    endDate: z.coerce.date(),
  })
  .strict();

const MedicineRegimenCreateWeeklySchema = z
  .object({
    ...commonCreateFields,
    scheduleType: z.literal("WEEKLY"),
    endDate: z.coerce.date().nullable().optional(),
    daysOfWeek: DaysOfWeekInputSchema,
  })
  .strict();

const MedicineRegimenCreateIntervalSchema = z
  .object({
    ...commonCreateFields,
    scheduleType: z.literal("INTERVAL"),
    endDate: z.coerce.date().nullable().optional(),
    intervalDays: z.coerce.number().int().min(1),
  })
  .strict();

const MedicineRegimenCreateCycleSchema = z
  .object({
    ...commonCreateFields,
    scheduleType: z.literal("CYCLE"),
    endDate: z.coerce.date().nullable().optional(),
    cycleOnDays: z.coerce.number().int().min(1),
    cycleBreakDays: z.coerce.number().int().min(1),
  })
  .strict();

export const MedicineRegimenCreateBodySchema = z
  .discriminatedUnion("scheduleType", [
    MedicineRegimenCreateDailySchema,
    MedicineRegimenCreateWeeklySchema,
    MedicineRegimenCreateIntervalSchema,
    MedicineRegimenCreateCycleSchema,
  ])
  .superRefine((val, ctx) => {
    if (val.endDate && val.endDate.getTime() < val.startDate.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "endDate must be on or after startDate",
      });
    }
  });

export const MedicineRegimenUpdateBodySchema = z
  .object({
    mediRegimenId: z.coerce.number().int().positive(),
    scheduleType: z.enum(scheduleTypeValues).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    daysOfWeek: DaysOfWeekInputSchema.nullable().optional(),
    intervalDays: z.coerce.number().int().min(1).nullable().optional(),
    cycleOnDays: z.coerce.number().int().min(1).nullable().optional(),
    cycleBreakDays: z.coerce.number().int().min(1).nullable().optional(),
  })
  .strict();

export type MedicineRegimenCreateBody = z.infer<typeof MedicineRegimenCreateBodySchema>;
export type MedicineRegimenUpdateBody = z.infer<typeof MedicineRegimenUpdateBodySchema>;
