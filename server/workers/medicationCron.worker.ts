import "dotenv/config";
import type { ScheduleType } from "@prisma/client";
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
  times: { timeOfDay: string; dose: number; unit: string }[];
  medicineList: null | {
    mediListId: number;
    profileId: number;
    profile: { userId: number; user: { timeZone: string | null } };
  };
}) {
  const scheduleTime = regimen.nextOccurrenceAt;
  if (!scheduleTime) return;

  const medicineList = regimen.medicineList;
  if (!medicineList) return;

  const profileId = medicineList.profileId;
  const userId = medicineList.profile.userId;
  const userTimeZone = medicineList.profile.user.timeZone ?? "Asia/Bangkok";
  const mediListId = medicineList.mediListId;

  // Find the dose and unit for this schedule time
  const timeString = formatInTimeZone(scheduleTime, userTimeZone, "HH:mm");
  const matchingTime = regimen.times.find((t) => t.timeOfDay === timeString);
  const dose = matchingTime?.dose ?? null;
  const unit = matchingTime?.unit ?? null;

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
    },
    update: {},
  });

  if (!log.pushSentAt) {
    const delay = scheduleTime.getTime() - Date.now();
    if (delay > 0) {
      console.log(`[medication-cron] waiting ${delay}ms for regimen ${regimen.mediRegimenId}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId, revokedAt: null },
      select: { deviceTokenId: true, token: true },
    });

    const tokens = deviceTokens.map((row) => row.token).filter(Boolean);

    if (tokens.length > 0) {
      try {
        const response = await sendFcmMulticast({
          tokens,
          notification: {
            title: "Medication reminder",
            body: "It's time to take your medicine.",
          },
          data: {
            type: "MEDICATION_REMINDER",
            logId: String(log.logId),
            profileId: String(profileId),
            mediListId: String(mediListId),
            mediRegimenId: String(regimen.mediRegimenId),
            scheduleTime: scheduleTime.toISOString(),
            snoozedCount: String(log.snoozedCount ?? 0),
            isSnoozeReminder: "false",
          },
        });

        const revokedCodes = new Set([
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token",
        ]);

        const revokeIds: number[] = [];
        response.responses.forEach((result, idx) => {
          if (result.success) return;
          const code = (result.error as { code?: string } | undefined)?.code;
          if (code && revokedCodes.has(code)) {
            revokeIds.push(deviceTokens[idx]!.deviceTokenId);
          }
        });

        if (revokeIds.length > 0) {
          await prisma.deviceToken.updateMany({
            where: { deviceTokenId: { in: revokeIds } },
            data: { revokedAt: new Date() },
          });
        }

        if (response.successCount > 0) {
          await prisma.medicationLog.updateMany({
            where: { logId: log.logId, pushSentAt: null },
            data: { pushSentAt: new Date() },
          });
        }
      } catch (error) {
        console.error(
          "[medication-cron] FCM send failed",
          regimen.mediRegimenId,
          error,
        );
      }
    }
  }

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
}

async function tick() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_MS);

  const dueRegimens = await prisma.userMedicineRegimen.findMany({
    where: {
      nextOccurrenceAt: { not: null, lte: windowEnd },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    take: MAX_REGIMENS_PER_TICK,
    include: {
      times: { select: { timeOfDay: true, dose: true, unit: true } },
      medicineList: {
        select: {
          mediListId: true,
          profileId: true,
          profile: {
            select: {
              userId: true,
              user: { select: { timeZone: true } },
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

  results.forEach((result, idx) => {
    if (result.status === "rejected") {
      console.error("[medication-cron] failed to process regimen", dueRegimens[idx].mediRegimenId, result.reason);
    }
  });
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
