import { ScheduleType } from "@prisma/client";
import { buildDateTimeFromTimeOfDay } from "@/server/common/timezone";

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
  intervalHour: number | null;
  times: Array<{ timeOfDay: string }>;
  userTimeZone: string;
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
    intervalHour,
    times,
    userTimeZone,
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
    intervalHour,
    timesCount: times.length,
    now: now.toISOString(),
  });

  if (!times || times.length === 0) {
    return null;
  }

  // Parse timeOfDay strings and sort by time
  const sortedTimes = times
    .map((t) => {
      const [hours, minutes] = t.timeOfDay.split(":").map(Number);
      return { hours, minutes, timeOfDay: t.timeOfDay };
    })
    .sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes));

  function makeDatetime(day: Date, timeOfDay: string): Date {
    // Build DateTime in user's timezone, then convert to UTC
    return buildDateTimeFromTimeOfDay(timeOfDay, day, userTimeZone);
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

  // ---------- intervalHour mode ----------
  // When intervalHour is set, times[0].timeOfDay is the "start time" for each active day.
  // We generate virtual slots: startTime, startTime + intervalHour, startTime + 2*intervalHour, ...
  // until the slot exceeds 23:59 of that day.
  // ---------- intervalHour mode ----------
  // When intervalHour is set, we want strict continuous intervals (previous + interval).
  // E.g. Mon 23:00 + 5h -> Tue 04:00.
  // We check if the resulting day is "valid". If so, that's the next slot.
  // If not, we keep adding intervalHour until we land on a valid day.
  if (intervalHour && intervalHour >= 1) {
    const freqHours = intervalHour;

    // 1. Determine the "Next Candidate".
    // If 'now' (the last scheduled time) is effectively "start of time" (before startDate), we need to bootstrap.
    // However, 'now' is passed as the Current Time or Last Schedule Time.
    // If it's the very first run (creation), 'now' might be arbitrary.

    // But usually 'now' passed from worker is the `nextOccurrenceAt` that just triggered.
    // So `candidate = now + interval`.

    let candidate = new Date(now);

    // Check if we are bootstrapping (e.g. now < startDate)
    // In creation, we already set nextOccurrenceAt to the first valid start time (via fixed logic or passed explicitly).
    // So here we can assume we are moving FORWARD from a valid slot.
    // EXCEPT if we are manually calling this for the first time?
    // Let's protect against "now < startDate".

    const startDateOnly = new Date(startDate);
    startDateOnly.setHours(0, 0, 0, 0);

    if (candidate < startDateOnly) {
      // Bootstrap: Find the very first start time on Start Date
      // Use the template time (times[0]) on Start Date
      const t = sortedTimes[0];
      candidate = makeDatetime(startDate, t.timeOfDay);

      // Note: If startDate itself is not a valid day (e.g. Mon, but StartDate is Tue), we need to forward to next valid day.
      // This bootstrap is complex.
      // SIMPLIFICATION: We assume the caller handles the FIRST occurrence (creation).
      // This function is primary for generating the *subsequent* occurrence.
      // But wait! createMedicineRegimen calls this to find the *first* nextOccurrenceAt too.
    }

    // If this is the FIRST run (creation), 'now' is unlikely to be the "last dose".
    // Logic:
    // Case A: Creating Regimen. `now` = current wall clock. 
    // We want the *first* matching slot >= now.
    // We can use the logic "Start from (Start Date + Start Time) and increment by freq until > now".

    // Case B: Worker. `now` = `scheduledTime` (e.g. Mon 08:00).
    // We want `Mon 08:00 + 5h`.

    // Unified Logic:
    // Anchor Point = StartDate + StartTime (times[0]).
    // We project forward from Anchor Point by N * freq, until we find time > now.

    const baseTime = sortedTimes[0];
    let anchor = makeDatetime(startDate, baseTime.timeOfDay);

    // If anchor is invalid day (e.g. Start on Tue, but Weekly Mon), move anchor to first valid start time?
    // Actually, "Every X Hours" usually implies "Start at X time on Start Date, then repeat".
    // If StartDate is not valid day? This is tricky.
    // Let's assume Anchor starts at the first valid "base time".

    // Find the first valid day >= startDate
    let searchDay = new Date(startDate);
    searchDay.setHours(0, 0, 0, 0);
    const maxDaySearch = 60; // 2 months lookahead for first valid day
    let validStartDay: Date | null = null;

    for (let i = 0; i < maxDaySearch; i++) {
      if (isDayValid(searchDay)) {
        validStartDay = new Date(searchDay);
        break;
      }
      searchDay.setDate(searchDay.getDate() + 1);
    }

    if (!validStartDay) return null; // No valid days in schedule

    // Set anchor to (ValidStartDay + StartTime)
    anchor = makeDatetime(validStartDay, baseTime.timeOfDay);

    // Now project forward from anchor until > now
    // optimization: if anchor is far behind now, jump closer
    const diffMs = now.getTime() - anchor.getTime();
    if (diffMs > 0) {
      // We are already past the anchor.
      // how many intervals fit?
      const intervalMs = freqHours * 60 * 60 * 1000;
      const jumps = Math.floor(diffMs / intervalMs);

      // Advance anchor
      const jumpTime = jumps * intervalMs;
      anchor = new Date(anchor.getTime() + jumpTime);
    }

    // Now loop until we find a valid slot > now
    // AND the slot falls on a valid day.
    const maxLoops = 1000; // safety break
    let loopCount = 0;

    while (loopCount < maxLoops) {
      // Try current anchor if > now
      if (anchor > now) {
        // Check if this slot falls on a valid day
        if (isDayValid(anchor)) {
          if (endDate && anchor > endDate) return null;
          return anchor;
        }
        // If invalid day, just keep adding interval (skipping the inactive period)
      }

      // Add interval
      anchor = new Date(anchor.getTime() + (freqHours * 60 * 60 * 1000));
      loopCount++;

      if (endDate && anchor > endDate) return null;
    }

    return null;
  }

  // ---------- Standard fixed-times mode ----------
  function findNextTimeOnDay(day: Date): Date | null {
    if (!isDayValid(day)) return null;

    for (const t of sortedTimes) {
      const candidate = makeDatetime(day, t.timeOfDay);
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
