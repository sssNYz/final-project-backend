import { ServiceError } from "@/server/common/errors";
import {
  findProfileByIdAndUserId,
  findMedicineListById,
  findRegimenById,
  listRegimensByProfileId,
  listRegimensByMediListId,
  createRegimenWithTimes,
  updateRegimenFields,
  deleteRegimenById,
  replaceRegimenTimes,
} from "./medicineRegimen.repository";
import { ScheduleType, MealRelation } from "@prisma/client";
import { calculateNextOccurrence } from "./nextOccurrence";
import { prisma } from "@/lib/prisma";

// ---------- Validation helpers ----------

function normalizeDaysOfWeek(daysOfWeek: string): string {
  const parts = daysOfWeek
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  if (parts.length === 0) {
    throw new ServiceError(400, { error: "daysOfWeek is required when scheduleType is WEEKLY" });
  }

  const days = new Set<number>();
  for (const part of parts) {
    const dayNum = Number(part);
    if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6) {
      throw new ServiceError(400, { error: "daysOfWeek must be comma-separated numbers 0-6 (0=Sunday, 6=Saturday)" });
    }
    days.add(dayNum);
  }

  return Array.from(days).sort((a, b) => a - b).join(",");
}

function validateTimeString(timeStr: string): void {
  // Validate timeOfDay format: "HH:MM" (e.g., "09:00", "14:30")
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeStr)) {
    throw new ServiceError(400, { error: `Invalid time format: ${timeStr}. Expected HH:MM format.` });
  }
}

function assertNoForbiddenScheduleFieldsProvided(
  scheduleType: ScheduleType,
  patch: {
    daysOfWeek?: string | null;
    intervalDays?: number | null;
    cycleOnDays?: number | null;
    cycleBreakDays?: number | null;
  }
) {
  const hasNonNull = (v: unknown) => v !== null && v !== undefined;

  if (scheduleType === "DAILY") {
    if (patch.daysOfWeek !== undefined && hasNonNull(patch.daysOfWeek)) {
      throw new ServiceError(400, { error: "daysOfWeek must be null/omitted when scheduleType is DAILY" });
    }
    if (patch.intervalDays !== undefined && hasNonNull(patch.intervalDays)) {
      throw new ServiceError(400, { error: "intervalDays must be null/omitted when scheduleType is DAILY" });
    }
    if (patch.cycleOnDays !== undefined && hasNonNull(patch.cycleOnDays)) {
      throw new ServiceError(400, { error: "cycleOnDays must be null/omitted when scheduleType is DAILY" });
    }
    if (patch.cycleBreakDays !== undefined && hasNonNull(patch.cycleBreakDays)) {
      throw new ServiceError(400, { error: "cycleBreakDays must be null/omitted when scheduleType is DAILY" });
    }
  }

  if (scheduleType === "WEEKLY") {
    if (patch.intervalDays !== undefined && hasNonNull(patch.intervalDays)) {
      throw new ServiceError(400, { error: "intervalDays must be null/omitted when scheduleType is WEEKLY" });
    }
    if (patch.cycleOnDays !== undefined && hasNonNull(patch.cycleOnDays)) {
      throw new ServiceError(400, { error: "cycleOnDays must be null/omitted when scheduleType is WEEKLY" });
    }
    if (patch.cycleBreakDays !== undefined && hasNonNull(patch.cycleBreakDays)) {
      throw new ServiceError(400, { error: "cycleBreakDays must be null/omitted when scheduleType is WEEKLY" });
    }
  }

  if (scheduleType === "INTERVAL") {
    if (patch.daysOfWeek !== undefined && hasNonNull(patch.daysOfWeek)) {
      throw new ServiceError(400, { error: "daysOfWeek must be null/omitted when scheduleType is INTERVAL" });
    }
    if (patch.cycleOnDays !== undefined && hasNonNull(patch.cycleOnDays)) {
      throw new ServiceError(400, { error: "cycleOnDays must be null/omitted when scheduleType is INTERVAL" });
    }
    if (patch.cycleBreakDays !== undefined && hasNonNull(patch.cycleBreakDays)) {
      throw new ServiceError(400, { error: "cycleBreakDays must be null/omitted when scheduleType is INTERVAL" });
    }
  }

  if (scheduleType === "CYCLE") {
    if (patch.daysOfWeek !== undefined && hasNonNull(patch.daysOfWeek)) {
      throw new ServiceError(400, { error: "daysOfWeek must be null/omitted when scheduleType is CYCLE" });
    }
    if (patch.intervalDays !== undefined && hasNonNull(patch.intervalDays)) {
      throw new ServiceError(400, { error: "intervalDays must be null/omitted when scheduleType is CYCLE" });
    }
  }
}

function normalizeAndValidateScheduleFields(
  scheduleType: ScheduleType,
  data: {
    daysOfWeek: string | null;
    intervalDays: number | null;
    cycleOnDays: number | null;
    cycleBreakDays: number | null;
  }
): {
  daysOfWeek: string | null;
  intervalDays: number | null;
  cycleOnDays: number | null;
  cycleBreakDays: number | null;
} {
  switch (scheduleType) {
    case "DAILY":
      return { daysOfWeek: null, intervalDays: null, cycleOnDays: null, cycleBreakDays: null };
    case "WEEKLY": {
      if (!data.daysOfWeek || data.daysOfWeek.trim() === "") {
        throw new ServiceError(400, { error: "daysOfWeek is required when scheduleType is WEEKLY" });
      }
      return { daysOfWeek: normalizeDaysOfWeek(data.daysOfWeek), intervalDays: null, cycleOnDays: null, cycleBreakDays: null };
    }
    case "INTERVAL": {
      if (!Number.isInteger(data.intervalDays) || (data.intervalDays ?? 0) < 1) {
        throw new ServiceError(400, { error: "intervalDays is required and must be >= 1 when scheduleType is INTERVAL" });
      }
      return { daysOfWeek: null, intervalDays: data.intervalDays, cycleOnDays: null, cycleBreakDays: null };
    }
    case "CYCLE": {
      if (!Number.isInteger(data.cycleOnDays) || (data.cycleOnDays ?? 0) < 1) {
        throw new ServiceError(400, { error: "cycleOnDays is required and must be >= 1 when scheduleType is CYCLE" });
      }
      if (!Number.isInteger(data.cycleBreakDays) || (data.cycleBreakDays ?? 0) < 1) {
        throw new ServiceError(400, { error: "cycleBreakDays is required and must be >= 1 when scheduleType is CYCLE" });
      }
      return { daysOfWeek: null, intervalDays: null, cycleOnDays: data.cycleOnDays, cycleBreakDays: data.cycleBreakDays };
    }
    default:
      throw new ServiceError(400, { error: "Invalid scheduleType" });
  }
}

function validateStartEndDate(scheduleType: ScheduleType, startDate: Date, endDate: Date | null) {
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new ServiceError(400, { error: "Invalid startDate" });
  }
  if (endDate !== null && (!(endDate instanceof Date) || isNaN(endDate.getTime()))) {
    throw new ServiceError(400, { error: "Invalid endDate" });
  }
  if (endDate && endDate.getTime() < startDate.getTime()) {
    throw new ServiceError(400, { error: "endDate must be on or after startDate" });
  }
  if (scheduleType === "DAILY" && !endDate) {
    throw new ServiceError(400, { error: "endDate is required when scheduleType is DAILY" });
  }
}

function validateTimes(times: Array<{
  time: string;
  dose: number;
  unit: string;
  mealRelation: MealRelation;
  mealOffsetMin?: number | null;
}>) {
  if (!times || times.length === 0) {
    throw new ServiceError(400, { error: "At least one time is required" });
  }

  for (const timeData of times) {
    // Validate time format
    if (!timeData.time || typeof timeData.time !== "string") {
      throw new ServiceError(400, { error: "time must be a string in HH:MM format" });
    }
    validateTimeString(timeData.time);

    // Validate dose
    if (!Number.isFinite(timeData.dose) || !Number.isInteger(timeData.dose) || timeData.dose < 1) {
      throw new ServiceError(400, { error: "dose must be an integer >= 1" });
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
      if (!Number.isFinite(timeData.mealOffsetMin) || !Number.isInteger(timeData.mealOffsetMin) || timeData.mealOffsetMin < 0) {
        throw new ServiceError(400, { error: "mealOffsetMin must be an integer >= 0" });
      }
    } else {
      // mealRelation is NONE, mealOffsetMin must be null or not provided
      if (timeData.mealOffsetMin !== null && timeData.mealOffsetMin !== undefined) {
        throw new ServiceError(400, { error: "mealOffsetMin must be null or not provided when mealRelation is NONE" });
      }
    }
  }
}

// ---------- Next Occurrence Calculator ----------

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

  const finalEndDate = endDate ?? null;
  validateStartEndDate(scheduleType, startDate, finalEndDate);

  // 2) Validate schedule fields based on scheduleType (and block irrelevant fields)
  assertNoForbiddenScheduleFieldsProvided(scheduleType, { daysOfWeek, intervalDays, cycleOnDays, cycleBreakDays });
  const schedule = normalizeAndValidateScheduleFields(scheduleType, {
    daysOfWeek: daysOfWeek ?? null,
    intervalDays: intervalDays ?? null,
    cycleOnDays: cycleOnDays ?? null,
    cycleBreakDays: cycleBreakDays ?? null,
  });

  // 3) Validate times
  validateTimes(times);

  // 4) Get user timezone (default to Asia/Bangkok)
  const userAccount = await prisma.userAccount.findUnique({
    where: { userId },
    select: { timeZone: true },
  });
  const userTimeZone = userAccount?.timeZone ?? "Asia/Bangkok";

  // 5) Prepare times with timeOfDay strings
  const timesWithTimeOfDay = times.map((t) => ({
    timeOfDay: t.time,
    dose: t.dose,
    unit: t.unit,
    mealRelation: t.mealRelation,
    mealOffsetMin: t.mealRelation !== "NONE" ? t.mealOffsetMin! : null,
  }));

  // 6) Calculate next occurrence
  const nextOccurrenceAt = calculateNextOccurrence({
    scheduleType,
    startDate,
    endDate: finalEndDate,
    daysOfWeek: schedule.daysOfWeek,
    intervalDays: schedule.intervalDays,
    cycleOnDays: schedule.cycleOnDays,
    cycleBreakDays: schedule.cycleBreakDays,
    times: timesWithTimeOfDay,
    userTimeZone,
  });

  // 7) Create regimen with times (transaction)
  const created = await createRegimenWithTimes({
    mediListId,
    scheduleType,
    startDate,
    endDate: finalEndDate,
    daysOfWeek: schedule.daysOfWeek,
    intervalDays: schedule.intervalDays,
    cycleOnDays: schedule.cycleOnDays,
    cycleBreakDays: schedule.cycleBreakDays,
    nextOccurrenceAt,
    times: timesWithTimeOfDay,
  });

  // 8) Format response
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
    nextOccurrenceAt: created.nextOccurrenceAt,
    times: created.times.map((t) => ({
      timeId: t.timeId,
      time: t.timeOfDay,
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
      nextOccurrenceAt: regimen.nextOccurrenceAt,
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
        time: t.timeOfDay,
        dose: t.dose,
        unit: t.unit,
        mealRelation: t.mealRelation,
        mealOffsetMin: t.mealOffsetMin,
      })),
    })),
  };
}

// ---------- LIST BY MEDICINE LIST ID ----------

export async function listMedicineRegimensByListId(params: { userId: number; mediListId: number }) {
  const { userId, mediListId } = params;

  // Check medicine list exists and belongs to user's profile
  const medicineList = await findMedicineListById(mediListId);
  if (!medicineList) {
    throw new ServiceError(404, { error: "Medicine list not found" });
  }

  const profile = await findProfileByIdAndUserId(medicineList.profileId, userId);
  if (!profile) {
    throw new ServiceError(403, { error: "Not allowed to view regimens for this medicine list" });
  }

  const regimens = await listRegimensByMediListId(mediListId);

  return {
    items: regimens.map((regimen) => ({
      mediRegimenId: regimen.mediRegimenId,
      mediListId: regimen.mediListId,
      scheduleType: regimen.scheduleType,
      startDate: regimen.startDate,
      endDate: regimen.endDate,
      nextOccurrenceAt: regimen.nextOccurrenceAt,
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
        time: t.timeOfDay,
        dose: t.dose,
        unit: t.unit,
        mealRelation: t.mealRelation,
        mealOffsetMin: t.mealOffsetMin,
      })),
    })),
  };
}

// ---------- GET BY ID ----------

export async function getMedicineRegimenById(params: { userId: number; mediRegimenId: number }) {
  const { userId, mediRegimenId } = params;

  // Find regimen
  const regimen = await findRegimenById(mediRegimenId);
  if (!regimen) {
    throw new ServiceError(404, { error: "Medicine regimen not found" });
  }

  // Check ownership
  if (!regimen.medicineList) {
    throw new ServiceError(404, { error: "Medicine list not found for this regimen" });
  }

  const profile = await findProfileByIdAndUserId(regimen.medicineList.profileId, userId);
  if (!profile) {
    throw new ServiceError(403, { error: "Not allowed to view this regimen" });
  }

  return {
    mediRegimenId: regimen.mediRegimenId,
    mediListId: regimen.mediListId,
    scheduleType: regimen.scheduleType,
    startDate: regimen.startDate,
    endDate: regimen.endDate,
    nextOccurrenceAt: regimen.nextOccurrenceAt,
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
      time: t.timeOfDay,
      dose: t.dose,
      unit: t.unit,
      mealRelation: t.mealRelation,
      mealOffsetMin: t.mealOffsetMin,
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
  times?: Array<{
    time: string;
    dose: number;
    unit: string;
    mealRelation: MealRelation;
    mealOffsetMin?: number | null;
  }>;
}) {
  const { userId, mediRegimenId, scheduleType, startDate, endDate, daysOfWeek, intervalDays, cycleOnDays, cycleBreakDays, times } = params;

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

  const hasAnyUserUpdate =
    scheduleType !== undefined ||
    startDate !== undefined ||
    endDate !== undefined ||
    daysOfWeek !== undefined ||
    intervalDays !== undefined ||
    cycleOnDays !== undefined ||
    cycleBreakDays !== undefined ||
    times !== undefined;

  if (!hasAnyUserUpdate) {
    throw new ServiceError(400, { error: "No fields to update" });
  }

  // 4) Block irrelevant schedule fields in the request (allow null to clear)
  assertNoForbiddenScheduleFieldsProvided(finalScheduleType, { daysOfWeek, intervalDays, cycleOnDays, cycleBreakDays });

  // 5) Validate times if provided
  if (times !== undefined) {
    validateTimes(times);
  }

  // 6) Build update data
  const updateData: {
    scheduleType?: ScheduleType;
    startDate?: Date;
    endDate?: Date | null;
    daysOfWeek?: string | null;
    intervalDays?: number | null;
    cycleOnDays?: number | null;
    cycleBreakDays?: number | null;
    nextOccurrenceAt?: Date | null;
  } = {};

  if (scheduleType !== undefined) updateData.scheduleType = scheduleType;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;
  if (intervalDays !== undefined) updateData.intervalDays = intervalDays;
  if (cycleOnDays !== undefined) updateData.cycleOnDays = cycleOnDays;
  if (cycleBreakDays !== undefined) updateData.cycleBreakDays = cycleBreakDays;

  // 7) Get user timezone (default to Asia/Bangkok)
  const userAccount = await prisma.userAccount.findUnique({
    where: { userId },
    select: { timeZone: true },
  });
  const userTimeZone = userAccount?.timeZone ?? "Asia/Bangkok";

  // 8) Recalculate nextOccurrenceAt with final merged values
  const finalStartDate = startDate ?? existing.startDate;
  const finalEndDate = endDate !== undefined ? endDate : existing.endDate;
  const finalDaysOfWeek = daysOfWeek !== undefined ? daysOfWeek : existing.daysOfWeek;
  const finalIntervalDays = intervalDays !== undefined ? intervalDays : existing.intervalDays;
  const finalCycleOnDays = cycleOnDays !== undefined ? cycleOnDays : existing.cycleOnDays;
  const finalCycleBreakDays = cycleBreakDays !== undefined ? cycleBreakDays : existing.cycleBreakDays;

  validateStartEndDate(finalScheduleType, finalStartDate, finalEndDate);
  const schedule = normalizeAndValidateScheduleFields(finalScheduleType, {
    daysOfWeek: finalDaysOfWeek ?? null,
    intervalDays: finalIntervalDays ?? null,
    cycleOnDays: finalCycleOnDays ?? null,
    cycleBreakDays: finalCycleBreakDays ?? null,
  });

  // Always persist normalized schedule fields so the DB cannot end up with mixed schedule settings.
  updateData.daysOfWeek = schedule.daysOfWeek;
  updateData.intervalDays = schedule.intervalDays;
  updateData.cycleOnDays = schedule.cycleOnDays;
  updateData.cycleBreakDays = schedule.cycleBreakDays;

  // 9) Determine which times to use for nextOccurrenceAt calculation
  // If new times are provided, use them; otherwise use existing times
  const timesForCalculation = times
    ? times.map((t) => ({
      timeOfDay: t.time,
      dose: t.dose,
      unit: t.unit,
      mealRelation: t.mealRelation,
      mealOffsetMin: t.mealRelation !== "NONE" ? t.mealOffsetMin! : null,
    }))
    : existing.times.map((t) => ({
      timeOfDay: t.timeOfDay,
      dose: t.dose,
      unit: t.unit,
      mealRelation: t.mealRelation,
      mealOffsetMin: t.mealOffsetMin,
    }));

  const nextOccurrenceAt = calculateNextOccurrence({
    scheduleType: finalScheduleType,
    startDate: finalStartDate,
    endDate: finalEndDate,
    daysOfWeek: schedule.daysOfWeek,
    intervalDays: schedule.intervalDays,
    cycleOnDays: schedule.cycleOnDays,
    cycleBreakDays: schedule.cycleBreakDays,
    times: timesForCalculation,
    userTimeZone,
  });

  updateData.nextOccurrenceAt = nextOccurrenceAt;

  // 10) Update regimen fields
  const updated = await updateRegimenFields(mediRegimenId, updateData);

  // 11) If times are provided, replace them
  let finalTimes = updated.times;
  if (times !== undefined) {
    const newTimes = await replaceRegimenTimes(mediRegimenId, timesForCalculation);
    finalTimes = newTimes;
  }

  // 12) Format response
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
    nextOccurrenceAt: updated.nextOccurrenceAt,
    medicineList: updated.medicineList
      ? {
        mediListId: updated.medicineList.mediListId,
        mediNickname: updated.medicineList.mediNickname,
        pictureOption: updated.medicineList.pictureOption,
        medicine: updated.medicineList.medicine,
      }
      : null,
    times: finalTimes.map((t) => ({
      timeId: t.timeId,
      time: t.timeOfDay,
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
