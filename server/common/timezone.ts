import { toDate } from "date-fns-tz";

/**
 * Build a UTC DateTime from a time-of-day string (HH:MM) and a date in a specific timezone.
 *
 * @param timeOfDay - Time string in "HH:MM" format (e.g., "15:00")
 * @param date - The date to combine with the time (only date part is used)
 * @param timeZone - IANA timezone string (e.g., "Asia/Bangkok")
 * @returns UTC DateTime representing that moment
 *
 * @example
 * // "15:00" on 2024-01-15 in Bangkok timezone
 * buildDateTimeFromTimeOfDay("15:00", new Date("2024-01-15"), "Asia/Bangkok")
 * // Returns: UTC DateTime for 2024-01-15 08:00:00 (15:00 Bangkok = 08:00 UTC)
 */
export function buildDateTimeFromTimeOfDay(
  timeOfDay: string,
  date: Date,
  timeZone: string
): Date {
  // Validate timeOfDay format (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeOfDay)) {
    throw new Error(`Invalid timeOfDay format: ${timeOfDay}. Expected HH:MM format.`);
  }

  // Parse hours and minutes
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  // Create a date string in ISO format (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  // Create ISO string with time: "YYYY-MM-DDTHH:MM:SS"
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const isoString = `${dateStr}T${timeStr}`;

  // Convert from the specified timezone to UTC
  // toDate interprets the ISO string as being in the specified timezone and returns a UTC Date
  return toDate(isoString, { timeZone });
}
