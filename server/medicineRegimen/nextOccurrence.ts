import { ScheduleType } from "@prisma/client";

/**
 * Calculate the next occurrence date/time for a regimen.
 * Returns null if the regimen has ended or no valid time exists.
 *
 * Note: pass `now` to control the "from" time (e.g. worker should pass the old `nextOccurrenceAt`
 * so schedules always move forward).
 */
export function calculateNextOccurrence(params: {
  scheduleType: ScheduleType;
  startDate: Date;
  endDate: Date | null;
  daysOfWeek: string | null;
  intervalDays: number | null;
  cycleOnDays: number | null;
  cycleBreakDays: number | null;
  times: Array<{ time: Date }>;
  now?: Date;
}): Date | null {
  const {
    scheduleType,
    startDate,
    endDate,
    daysOfWeek,
    intervalDays,
    cycleOnDays,
    cycleBreakDays,
    times,
    now = new Date(),
  } = params;

  console.log("Calculate next occurrence:", {
    scheduleType,
    startDate: startDate.toISOString(),
    endDate: endDate?.toISOString(),
    daysOfWeek,
    intervalDays,
    cycleOnDays,
    cycleBreakDays,
    timesCount: times.length,
    now: now.toISOString(),
  });

  if (!times || times.length === 0) {
    return null;
  }

  const sortedTimes = times
    .map((t) => ({
      hours: t.time.getHours(),
      minutes: t.time.getMinutes(),
    }))
    .sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes));

  function makeDatetime(day: Date, hours: number, minutes: number): Date {
    const result = new Date(day);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  function isValidWeeklyDay(day: Date): boolean {
    if (!daysOfWeek) return false;
    const dayOfWeek = day.getDay(); // 0=Sunday, 6=Saturday
    const allowedDays = daysOfWeek.split(",").map((d) => Number(d.trim()));
    return allowedDays.includes(dayOfWeek);
  }

  function isValidIntervalDay(day: Date): boolean {
    if (!intervalDays || intervalDays < 1) return false;
    const startMs = new Date(startDate).setHours(0, 0, 0, 0);
    const dayMs = new Date(day).setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dayMs - startMs) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 && diffDays % intervalDays === 0;
  }

  function isValidCycleDay(day: Date): boolean {
    if (!cycleOnDays || cycleOnDays < 1 || !cycleBreakDays || cycleBreakDays < 1) {
      return false;
    }
    const cyclePeriod = cycleOnDays + cycleBreakDays;
    const startMs = new Date(startDate).setHours(0, 0, 0, 0);
    const dayMs = new Date(day).setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dayMs - startMs) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) return false;
    const positionInCycle = diffDays % cyclePeriod;
    return positionInCycle < cycleOnDays;
  }

  function isDayValid(day: Date): boolean {
    const dayDateOnly = new Date(day).setHours(0, 0, 0, 0);
    const startDateOnly = new Date(startDate).setHours(0, 0, 0, 0);
    if (dayDateOnly < startDateOnly) return false;

    switch (scheduleType) {
      case "DAILY":
        return true;
      case "WEEKLY":
        return isValidWeeklyDay(day);
      case "INTERVAL":
        return isValidIntervalDay(day);
      case "CYCLE":
        return isValidCycleDay(day);
      default:
        return false;
    }
  }

  function findNextTimeOnDay(day: Date): Date | null {
    if (!isDayValid(day)) return null;

    for (const t of sortedTimes) {
      const candidate = makeDatetime(day, t.hours, t.minutes);
      if (candidate > now) {
        return candidate;
      }
    }
    return null;
  }

  const maxSearchDays = 400;
  let currentDay = new Date(now);
  currentDay.setHours(0, 0, 0, 0);
  currentDay.setMinutes(0, 0, 0);

  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  startDateOnly.setMinutes(0, 0, 0);
  if (currentDay < startDateOnly) {
    currentDay = new Date(startDateOnly);
  }

  for (let i = 0; i < maxSearchDays; i += 1) {
    if (endDate) {
      const endDateOnly = new Date(endDate);
      endDateOnly.setHours(23, 59, 59, 999);
      if (currentDay > endDateOnly) {
        return null;
      }
    }

    const nextTime = findNextTimeOnDay(currentDay);
    if (nextTime) {
      if (endDate && nextTime > endDate) {
        return null;
      }
      return nextTime;
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return null;
}
