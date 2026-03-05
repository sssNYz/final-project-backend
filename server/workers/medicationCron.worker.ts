import "dotenv/config";
import type { MealRelation, ScheduleType } from "@prisma/client";
import { prisma } from "../db/client";
// Removed direct FCM import
import { calculateNextOccurrence } from "../medicineRegimen/nextOccurrence";
import { formatInTimeZone } from "date-fns-tz";
import { notificationQueue } from "../queue/client";
import cron from "node-cron";

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
  intervalHour: number | null;
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
  if (!medicineList) {
    // Disable corrupted regimen to prevent infinite loop
    await prisma.userMedicineRegimen.update({
      where: { mediRegimenId: regimen.mediRegimenId },
      data: { nextOccurrenceAt: null },
    });
    return null;
  }

  const profileId = medicineList.profileId;
  const userId = medicineList.profile.userId;
  const userTimeZone = medicineList.profile.user.timeZone ?? "Asia/Bangkok";
  const mediListId = medicineList.mediListId;

  // Find the dose and unit for this schedule time
  let dose: number | null = null;
  let unit: string | null = null;
  let mealRelation: MealRelation | null = null;

  if (regimen.intervalHour && regimen.intervalHour >= 1) {
    // intervalHour mode: use the first time entry as the dose template
    // (the actual scheduled time is dynamically generated and won't match any stored timeOfDay)
    const template = regimen.times[0];
    if (template) {
      dose = template.dose;
      unit = template.unit;
      mealRelation = template.mealRelation;
    }
  } else {
    // Standard mode: match exact timeOfDay string
    const timeString = formatInTimeZone(scheduleTime, userTimeZone, "HH:mm");
    const matchingTime = regimen.times.find((t) => t.timeOfDay === timeString);
    dose = matchingTime?.dose ?? null;
    unit = matchingTime?.unit ?? null;
    mealRelation = matchingTime?.mealRelation ?? null;
  }

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

  // Calculate Next Occurrence
  const next = calculateNextOccurrence({
    scheduleType: regimen.scheduleType,
    startDate: regimen.startDate,
    endDate: regimen.endDate,
    daysOfWeek: regimen.daysOfWeek,
    intervalDays: regimen.intervalDays,
    cycleOnDays: regimen.cycleOnDays,
    cycleBreakDays: regimen.cycleBreakDays,
    intervalHour: regimen.intervalHour,
    times: regimen.times,
    userTimeZone,
    now: scheduleTime,
  });

  // Update Regimen to point to next time
  await prisma.userMedicineRegimen.updateMany({
    where: { mediRegimenId: regimen.mediRegimenId, nextOccurrenceAt: scheduleTime },
    data: { nextOccurrenceAt: next },
  });

  // NEW: Do NOT Add to Queue Individually!
  // await notificationQueue.add("send-notification", {
  //   logId: log.logId
  // });

  return log.logId;
}

async function tick() {
  const now = new Date();
  // We use LOOKAHEAD slightly to catch things just about to happen or slightly passed
  // But wait, the previous logic was: find things where nextOccurrenceAt <= now

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

  console.log(`[medication-cron] Processing ${dueRegimens.length} regimens -> Queue`);

  // Process in parallel
  const results = await Promise.allSettled(dueRegimens.map(regimen => processRegimen(regimen)));

  const successLogs = results.filter(r => r.status === "fulfilled" && r.value !== null).map(r => (r as PromiseFulfilledResult<number>).value);
  const failCount = results.filter(r => r.status === "rejected").length;

  if (successLogs.length > 0) {
    // 1. Group the success logs by UserId
    const logRecords = await prisma.medicationLog.findMany({
      where: { logId: { in: successLogs } },
      select: { logId: true, medicineList: { select: { profile: { select: { userId: true } } } } }
    });

    const groups: Record<number, number[]> = {};
    for (const log of logRecords) {
      const userId = log.medicineList?.profile?.userId;
      if (userId) {
        if (!groups[userId]) groups[userId] = [];
        groups[userId].push(log.logId);
      }
    }

    // 2. Enqueue packed push notifications per user
    let enqueued = 0;
    for (const [userId, logIds] of Object.entries(groups)) {
      await notificationQueue.add("send-notification-group", {
        logIds,
        isSnooze: false
      });
      enqueued++;
    }
    console.log(`[medication-cron] Enqueued ${enqueued} groups for ${successLogs.length} logs. Failed: ${failCount}`);
  } else {
    console.log(`[medication-cron] Enqueued 0 groups for 0 logs. Failed: ${failCount}`);
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
  `[medication-cron] started intervalMs=${INTERVAL_MS} lookaheadMs=${LOOKAHEAD_MS} (using node-cron for :00 alignment)`,
);

cron.schedule("* * * * *", safeTick);

async function shutdown(signal: string) {
  console.log(`[medication-cron] shutting down (${signal})`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
