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

  // Calculate Next Occurrence
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

  // Update Regimen to point to next time
  await prisma.userMedicineRegimen.updateMany({
    where: { mediRegimenId: regimen.mediRegimenId, nextOccurrenceAt: scheduleTime },
    data: { nextOccurrenceAt: next },
  });

  if (log.pushSentAt) return null; // Already sent, don't queue

  // NEW: Add to Queue
  await notificationQueue.add("send-notification", {
    logId: log.logId
  });

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

  const successCount = results.filter(r => r.status === "fulfilled" && r.value !== null).length;
  const failCount = results.filter(r => r.status === "rejected").length;

  console.log(`[medication-cron] Enqueued ${successCount} jobs. Failed: ${failCount}`);
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
