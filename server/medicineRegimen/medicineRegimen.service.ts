// server/medicineRegimen/medicineRegimen.service.ts
import { ServiceError } from "@/server/common/errors";
import {
  findProfileByIdAndUserId,
  findMedicineListById,
  findRegimenById,
  listRegimensByProfileId,
  createRegimenWithTimes,
  updateRegimenFields,
  deleteRegimenById,
} from "./medicineRegimen.repository";
import { ScheduleType, MealRelation } from "@prisma/client";

// ---------- Validation helpers ----------

function parseTimeString(timeStr: string, baseDate: Date): Date {
  // timeStr format: "HH:MM" (e.g., "09:00", "14:30")
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new ServiceError(400, { error: `Invalid time format: ${timeStr}. Expected HH:MM format.` });
  }

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTimeToHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function validateScheduleFields(scheduleType: ScheduleType, data: {
  daysOfWeek?: string | null;
  intervalDays?: number | null;
  cycleOnDays?: number | null;
  cycleBreakDays?: number | null;
}) {
  if (scheduleType === "WEEKLY") {
    if (!data.daysOfWeek || data.daysOfWeek.trim() === "") {
      throw new ServiceError(400, { error: "daysOfWeek is required when scheduleType is WEEKLY" });
    }
    // Validate daysOfWeek format (comma-separated numbers 0-6)
    const days = data.daysOfWeek.split(",").map((d) => d.trim());
    for (const day of days) {
      const dayNum = Number(day);
      if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
        throw new ServiceError(400, { error: "daysOfWeek must be comma-separated numbers 0-6 (0=Sunday, 6=Saturday)" });
      }
    }
  }

  if (scheduleType === "INTERVAL") {
    if (data.intervalDays === null || data.intervalDays === undefined || data.intervalDays < 1) {
      throw new ServiceError(400, { error: "intervalDays is required and must be >= 1 when scheduleType is INTERVAL" });
    }
  }

  if (scheduleType === "CYCLE") {
    if (data.cycleOnDays === null || data.cycleOnDays === undefined || data.cycleOnDays < 1) {
      throw new ServiceError(400, { error: "cycleOnDays is required and must be >= 1 when scheduleType is CYCLE" });
    }
    if (data.cycleBreakDays === null || data.cycleBreakDays === undefined || data.cycleBreakDays < 1) {
      throw new ServiceError(400, { error: "cycleBreakDays is required and must be >= 1 when scheduleType is CYCLE" });
    }
  }
}

function validateTimes(times: Array<{
  time: string;
  dose: number;
  unit: string;
  mealRelation: MealRelation;
  mealOffsetMin?: number | null;
}>, startDate: Date) {
  if (!times || times.length === 0) {
    throw new ServiceError(400, { error: "At least one time is required" });
  }

  for (const timeData of times) {
    // Validate time format
    if (!timeData.time || typeof timeData.time !== "string") {
      throw new ServiceError(400, { error: "time must be a string in HH:MM format" });
    }

    // Validate dose
    if (!timeData.dose || timeData.dose < 1) {
      throw new ServiceError(400, { error: "dose must be >= 1" });
    }

    // Validate unit
    if (!timeData.unit || typeof timeData.unit !== "string" || timeData.unit.trim() === "") {
      throw new ServiceError(400, { error: "unit is required" });
    }

    // Validate mealRelation
    if (!timeData.mealRelation || !["BEFORE_MEAL", "AFTER_MEAL", "WITH_MEAL", "NONE"].includes(timeData.mealRelation)) {
      throw new ServiceError(400, { error: "mealRelation must be one of: BEFORE_MEAL, AFTER_MEAL, WITH_MEAL, NONE" });
    }

    // Validate mealOffsetMin based on mealRelation
    if (timeData.mealRelation !== "NONE") {
      if (timeData.mealOffsetMin === null || timeData.mealOffsetMin === undefined) {
        throw new ServiceError(400, { error: "mealOffsetMin is required when mealRelation is not NONE" });
      }
      if (typeof timeData.mealOffsetMin !== "number") {
        throw new ServiceError(400, { error: "mealOffsetMin must be a number" });
      }
    } else {
      // mealRelation is NONE, mealOffsetMin must be null or not provided
      if (timeData.mealOffsetMin !== null && timeData.mealOffsetMin !== undefined) {
        throw new ServiceError(400, { error: "mealOffsetMin must be null or not provided when mealRelation is NONE" });
      }
    }
  }
}

// ---------- CREATE ----------

export async function createMedicineRegimen(params: {
  userId: number;
  mediListId: number;
  scheduleType: ScheduleType;
  startDate: Date;
  endDate?: Date | null;
  daysOfWeek?: string | null;
  intervalDays?: number | null;
  cycleOnDays?: number | null;
  cycleBreakDays?: number | null;
  times: Array<{
    time: string;
    dose: number;
    unit: string;
    mealRelation: MealRelation;
    mealOffsetMin?: number | null;
  }>;
}) {
  const { userId, mediListId, scheduleType, startDate, endDate, daysOfWeek, intervalDays, cycleOnDays, cycleBreakDays, times } = params;

  // 1) Check medicine list exists and belongs to user's profile
  const medicineList = await findMedicineListById(mediListId);
  if (!medicineList) {
    throw new ServiceError(404, { error: "Medicine list not found" });
  }

  const profile = await findProfileByIdAndUserId(medicineList.profileId, userId);
  if (!profile) {
    throw new ServiceError(403, { error: "Not allowed to create regimen for this medicine list" });
  }

  // 2) Validate schedule fields based on scheduleType
  validateScheduleFields(scheduleType, { daysOfWeek, intervalDays, cycleOnDays, cycleBreakDays });

  // 3) Validate times
  validateTimes(times, startDate);

  // 4) Convert time strings to DateTime using startDate as base
  const timesWithDates = times.map((t) => ({
    time: parseTimeString(t.time, startDate),
    dose: t.dose,
    unit: t.unit,
    mealRelation: t.mealRelation,
    mealOffsetMin: t.mealRelation !== "NONE" ? t.mealOffsetMin! : null,
  }));

  // 5) Create regimen with times (transaction)
  const created = await createRegimenWithTimes({
    mediListId,
    scheduleType,
    startDate,
    endDate: endDate ?? null,
    daysOfWeek: daysOfWeek ?? null,
    intervalDays: intervalDays ?? null,
    cycleOnDays: cycleOnDays ?? null,
    cycleBreakDays: cycleBreakDays ?? null,
    times: timesWithDates,
  });

  // 6) Format response
  return {
    mediRegimenId: created.mediRegimenId,
    mediListId: created.mediListId,
    scheduleType: created.scheduleType,
    startDate: created.startDate,
    endDate: created.endDate,
    daysOfWeek: created.daysOfWeek,
    intervalDays: created.intervalDays,
    cycleOnDays: created.cycleOnDays,
    cycleBreakDays: created.cycleBreakDays,
    times: created.times.map((t) => ({
      timeId: t.timeId,
      time: formatTimeToHHMM(t.time),
      dose: t.dose,
      unit: t.unit,
      mealRelation: t.mealRelation,
      mealOffsetMin: t.mealOffsetMin,
    })),
  };
}

// ---------- LIST ----------

export async function listMedicineRegimens(params: { userId: number; profileId: number }) {
  const { userId, profileId } = params;

  // Check profile belongs to user
  const profile = await findProfileByIdAndUserId(profileId, userId);
  if (!profile) {
    throw new ServiceError(404, { error: "Profile not found or not yours" });
  }

  const regimens = await listRegimensByProfileId(profileId);

  return {
    items: regimens.map((regimen) => ({
      mediRegimenId: regimen.mediRegimenId,
      mediListId: regimen.mediListId,
      scheduleType: regimen.scheduleType,
      startDate: regimen.startDate,
      endDate: regimen.endDate,
      daysOfWeek: regimen.daysOfWeek,
      intervalDays: regimen.intervalDays,
      cycleOnDays: regimen.cycleOnDays,
      cycleBreakDays: regimen.cycleBreakDays,
      medicineList: regimen.medicineList
        ? {
            mediListId: regimen.medicineList.mediListId,
            mediNickname: regimen.medicineList.mediNickname,
            pictureOption: regimen.medicineList.pictureOption,
            medicine: regimen.medicineList.medicine,
          }
        : null,
      times: regimen.times.map((t) => ({
        timeId: t.timeId,
        time: formatTimeToHHMM(t.time),
        dose: t.dose,
        unit: t.unit,
        mealRelation: t.mealRelation,
        mealOffsetMin: t.mealOffsetMin,
      })),
    })),
  };
}

// ---------- UPDATE ----------

export async function updateMedicineRegimen(params: {
  userId: number;
  mediRegimenId: number;
  scheduleType?: ScheduleType;
  startDate?: Date;
  endDate?: Date | null;
  daysOfWeek?: string | null;
  intervalDays?: number | null;
  cycleOnDays?: number | null;
  cycleBreakDays?: number | null;
}) {
  const { userId, mediRegimenId, scheduleType, startDate, endDate, daysOfWeek, intervalDays, cycleOnDays, cycleBreakDays } = params;

  // 1) Find regimen
  const existing = await findRegimenById(mediRegimenId);
  if (!existing) {
    throw new ServiceError(404, { error: "Medicine regimen not found" });
  }

  // 2) Check ownership
  if (!existing.medicineList) {
    throw new ServiceError(404, { error: "Medicine list not found for this regimen" });
  }

  const profile = await findProfileByIdAndUserId(existing.medicineList.profileId, userId);
  if (!profile) {
    throw new ServiceError(403, { error: "Not allowed to update this regimen" });
  }

  // 3) Determine scheduleType to validate (use provided or existing)
  const finalScheduleType = scheduleType ?? existing.scheduleType;

  // 4) Validate schedule fields if scheduleType is being changed or related fields are provided
  if (scheduleType || daysOfWeek !== undefined || intervalDays !== undefined || cycleOnDays !== undefined || cycleBreakDays !== undefined) {
    validateScheduleFields(finalScheduleType, {
      daysOfWeek: daysOfWeek !== undefined ? daysOfWeek : existing.daysOfWeek,
      intervalDays: intervalDays !== undefined ? intervalDays : existing.intervalDays,
      cycleOnDays: cycleOnDays !== undefined ? cycleOnDays : existing.cycleOnDays,
      cycleBreakDays: cycleBreakDays !== undefined ? cycleBreakDays : existing.cycleBreakDays,
    });
  }

  // 5) Build update data
  const updateData: {
    scheduleType?: ScheduleType;
    startDate?: Date;
    endDate?: Date | null;
    daysOfWeek?: string | null;
    intervalDays?: number | null;
    cycleOnDays?: number | null;
    cycleBreakDays?: number | null;
  } = {};

  if (scheduleType !== undefined) updateData.scheduleType = scheduleType;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;
  if (intervalDays !== undefined) updateData.intervalDays = intervalDays;
  if (cycleOnDays !== undefined) updateData.cycleOnDays = cycleOnDays;
  if (cycleBreakDays !== undefined) updateData.cycleBreakDays = cycleBreakDays;

  if (Object.keys(updateData).length === 0) {
    throw new ServiceError(400, { error: "No fields to update" });
  }

  // 6) Update regimen (times stay unchanged)
  const updated = await updateRegimenFields(mediRegimenId, updateData);

  // 7) Format response
  return {
    mediRegimenId: updated.mediRegimenId,
    mediListId: updated.mediListId,
    scheduleType: updated.scheduleType,
    startDate: updated.startDate,
    endDate: updated.endDate,
    daysOfWeek: updated.daysOfWeek,
    intervalDays: updated.intervalDays,
    cycleOnDays: updated.cycleOnDays,
    cycleBreakDays: updated.cycleBreakDays,
    medicineList: updated.medicineList
      ? {
          mediListId: updated.medicineList.mediListId,
          mediNickname: updated.medicineList.mediNickname,
          pictureOption: updated.medicineList.pictureOption,
          medicine: updated.medicineList.medicine,
        }
      : null,
    times: updated.times.map((t) => ({
      timeId: t.timeId,
      time: formatTimeToHHMM(t.time),
      dose: t.dose,
      unit: t.unit,
      mealRelation: t.mealRelation,
      mealOffsetMin: t.mealOffsetMin,
    })),
  };
}

// ---------- DELETE ----------

export async function deleteMedicineRegimen(params: { userId: number; mediRegimenId: number }) {
  const { userId, mediRegimenId } = params;

  // 1) Find regimen
  const existing = await findRegimenById(mediRegimenId);
  if (!existing) {
    throw new ServiceError(404, { error: "Medicine regimen not found" });
  }

  // 2) Check ownership
  if (!existing.medicineList) {
    throw new ServiceError(404, { error: "Medicine list not found for this regimen" });
  }

  const profile = await findProfileByIdAndUserId(existing.medicineList.profileId, userId);
  if (!profile) {
    throw new ServiceError(403, { error: "Not allowed to delete this regimen" });
  }

  // 3) Delete regimen (cascade deletes times)
  await deleteRegimenById(mediRegimenId);

  return { message: "Medicine regimen deleted successfully" };
}

