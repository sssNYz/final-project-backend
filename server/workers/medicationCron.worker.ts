import "dotenv/config";
import type { MealRelation, ScheduleType } from "@prisma/client";
import { prisma } from "../db/client";
import { sendFcmMulticast } from "../push/fcm";
import { calculateNextOccurrence } from "../medicineRegimen/nextOccurrence";
import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_LOOKAHEAD_MS = 60 * 1000;
const DEFAULT_MAX_REGIMENS_PER_TICK = 500;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const INTERVAL_MS = parsePositiveInt(
  process.env.MEDICATION_CRON_INTERVAL_MS,
  DEFAULT_INTERVAL_MS,
);

const LOOKAHEAD_MS = parsePositiveInt(
  process.env.MEDICATION_CRON_LOOKAHEAD_MS,
  DEFAULT_LOOKAHEAD_MS,
);

const MAX_REGIMENS_PER_TICK = parsePositiveInt(
  process.env.MEDICATION_CRON_MAX_REGIMENS_PER_TICK,
  DEFAULT_MAX_REGIMENS_PER_TICK,
);

async function processRegimen(regimen: {
  mediRegimenId: number;
  nextOccurrenceAt: Date | null;
  scheduleType: ScheduleType;
  startDate: Date;
  endDate: Date | null;
  daysOfWeek: string | null;
  intervalDays: number | null;
  cycleOnDays: number | null;
  cycleBreakDays: number | null;
  times: { timeOfDay: string; dose: number; unit: string; mealRelation: MealRelation }[];
  medicineList: null | {
    mediListId: number;
    profileId: number;
    profile: { userId: number; user: { timeZone: string | null }; profilePicture: string | null; profileName: string };
  };
}) {
  const scheduleTime = regimen.nextOccurrenceAt;
  if (!scheduleTime) return null;

  const medicineList = regimen.medicineList;
  if (!medicineList) return null;

  const profileId = medicineList.profileId;
  const userId = medicineList.profile.userId;
  const userTimeZone = medicineList.profile.user.timeZone ?? "Asia/Bangkok";
  const mediListId = medicineList.mediListId;
  const profilePicture = medicineList.profile.profilePicture ?? "";
  const profileName = medicineList.profile.profileName;

  // Find the dose and unit for this schedule time
  const timeString = formatInTimeZone(scheduleTime, userTimeZone, "HH:mm");
  const matchingTime = regimen.times.find((t) => t.timeOfDay === timeString);
  const dose = matchingTime?.dose ?? null;
  const unit = matchingTime?.unit ?? null;
  const mealRelation = matchingTime?.mealRelation ?? null;

  const log = await prisma.medicationLog.upsert({
    where: {
      profileId_mediListId_scheduleTime: {
        profileId,
        mediListId,
        scheduleTime,
      },
    },
    create: {
      profileId,
      mediListId,
      scheduleTime,
      isReceived: false,
      dose,
      unit,
      mealRelation,
    },
    update: {},
  });

  const next = calculateNextOccurrence({
    scheduleType: regimen.scheduleType,
    startDate: regimen.startDate,
    endDate: regimen.endDate,
    daysOfWeek: regimen.daysOfWeek,
    intervalDays: regimen.intervalDays,
    cycleOnDays: regimen.cycleOnDays,
    cycleBreakDays: regimen.cycleBreakDays,
    times: regimen.times,
    userTimeZone,
    now: scheduleTime,
  });

  await prisma.userMedicineRegimen.updateMany({
    where: { mediRegimenId: regimen.mediRegimenId, nextOccurrenceAt: scheduleTime },
    data: { nextOccurrenceAt: next },
  });

  if (log.pushSentAt) return null; // Already sent

  return {
    logId: log.logId,
    profileId,
    profileName,
    userId,
    mediListId,
    mediRegimenId: regimen.mediRegimenId,
    scheduleTime,
    profilePicture,
    snoozedCount: log.snoozedCount ?? 0,
  };
}

async function tick() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_MS);

  const dueRegimens = await prisma.userMedicineRegimen.findMany({
    where: {
      nextOccurrenceAt: { not: null, lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    take: MAX_REGIMENS_PER_TICK,
    include: {
      times: { select: { timeOfDay: true, dose: true, unit: true, mealRelation: true } },
      medicineList: {
        select: {
          mediListId: true,
          profileId: true,
          profile: {
            select: {
              userId: true,
              user: { select: { timeZone: true } },
              profilePicture: true,
              profileName: true,
            },
          },
        },
      },
    },
    orderBy: { nextOccurrenceAt: "asc" },
  });

  if (dueRegimens.length === 0) return;

  console.log(`[medication-cron] processing ${dueRegimens.length} regimens`);

  // Process in parallel so one wait doesn't block others
  const results = await Promise.allSettled(dueRegimens.map(regimen => processRegimen(regimen)));

  const createdLogs: NonNullable<Awaited<ReturnType<typeof processRegimen>>>[] = [];

  results.forEach((result, idx) => {
    if (result.status === "rejected") {
      console.error("[medication-cron] failed to process regimen", dueRegimens[idx].mediRegimenId, result.reason);
    } else if (result.value) {
      createdLogs.push(result.value);
    }
  });

  // Group by User ID
  const logsByUser: Record<number, typeof createdLogs> = {};
  for (const log of createdLogs) {
    if (!logsByUser[log.userId]) logsByUser[log.userId] = [];
    logsByUser[log.userId].push(log);
  }

  // Send Notifications per User
  for (const userIdStr in logsByUser) {
    const userId = Number(userIdStr);
    const userLogs = logsByUser[userId];

    if (userLogs.length === 0) continue;

    // Fetch tokens once per user
    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId, revokedAt: null },
      select: { deviceTokenId: true, token: true },
    });

    const tokens = deviceTokens.map((row) => row.token).filter(Boolean);
    if (tokens.length === 0) continue;

    // Check if we have multiple profiles involved
    const distinctProfileNames = [...new Set(userLogs.map(l => l.profileName))];
    const medicationCount = userLogs.length;

    let title = "Medication Reminder";
    let body = "It's time to take your medicine.";
    let profilePicture = userLogs[0].profilePicture; // Default to first

    if (medicationCount > 1) {
      const names = distinctProfileNames.join(" & ");
      title = `Medications Due (${medicationCount})`;
      body = `You have ${medicationCount} medications due for ${names}.`;
      // For multiple, we might want to clear profilePicture or use a generic one?
      // Keeping first one or empty if mixed might be better.
      if (distinctProfileNames.length > 1) {
        profilePicture = ""; // Mixed profiles, no single picture
      }
    }

    try {
      const response = await sendFcmMulticast({
        tokens,
        notification: {
          title,
          body,
        },
        data: {
          type: medicationCount > 1 ? "MEDICATION_SUMMARY" : "MEDICATION_REMINDER",
          count: String(medicationCount),
          // We can't send ALL IDs in detail if too many, but for a few we can.
          // Let's send a summary payload.
          timestamp: new Date().toISOString(),
          profilePicture,
          // Legacy fields for single notification backward compatibility if count == 1
          ...(medicationCount === 1 ? {
            logId: String(userLogs[0].logId),
            profileId: String(userLogs[0].profileId),
            mediListId: String(userLogs[0].mediListId),
            mediRegimenId: String(userLogs[0].mediRegimenId),
            scheduleTime: userLogs[0].scheduleTime.toISOString(),
            snoozedCount: String(userLogs[0].snoozedCount),
            isSnoozeReminder: "false",
          } : {
            // New field for summary: full details as JSON string
            payload: JSON.stringify(userLogs.map(l => ({
              logId: l.logId,
              profileId: l.profileId,
              mediListId: l.mediListId,
              mediRegimenId: l.mediRegimenId,
              scheduleTime: l.scheduleTime.toISOString(),
              snoozedCount: l.snoozedCount,
              profileName: l.profileName,
              // You might want to add dose/unit/medName if available in userLogs or fetch them
              // userLogs currently has limited info, but let's send what we have.
            })))
          })
        },
      });

      // Handle token revocation (same as before)
      const revokedCodes = new Set([
        "messaging/registration-token-not-registered",
        "messaging/invalid-registration-token",
      ]);

      const revokeIds: number[] = [];
      response.responses.forEach((result, idx) => {
        if (!result.success && result.error?.code && revokedCodes.has(result.error.code)) {
          revokeIds.push(deviceTokens[idx].deviceTokenId);
        }
      });

      if (revokeIds.length > 0) {
        await prisma.deviceToken.updateMany({
          where: { deviceTokenId: { in: revokeIds } },
          data: { revokedAt: new Date() },
        });
      }

      // Mark push as sent for ALL logs involved
      if (response.successCount > 0) {
        const logIds = userLogs.map(l => l.logId);
        await prisma.medicationLog.updateMany({
          where: { logId: { in: logIds }, pushSentAt: null },
          data: { pushSentAt: new Date() }
        });
      }

    } catch (error) {
      console.error(`[medication-cron] Failed to send aggregated push for user ${userId}`, error);
    }
  }
}

let running = false;
async function safeTick() {
  if (running) return;
  running = true;
  try {
    await tick();
  } finally {
    running = false;
  }
}

console.log(
  `[medication-cron] started intervalMs=${INTERVAL_MS} lookaheadMs=${LOOKAHEAD_MS}`,
);

await safeTick();
const interval = setInterval(safeTick, INTERVAL_MS);
interval.unref();

async function shutdown(signal: string) {
  console.log(`[medication-cron] shutting down (${signal})`);
  clearInterval(interval);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
