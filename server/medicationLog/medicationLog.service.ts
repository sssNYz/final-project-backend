import { ResponseStatus } from "@prisma/client";
import { ServiceError } from "@/server/common/errors";
import * as repo from "./medicationLog.repository";
import { getNativeTimezoneOffset } from "@/server/common/timezone";

const SNOOZE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SNOOZE_COUNT = 3;

// ---------- List Logs ----------

export async function listMedicationLogs(params: {
    userId: number;
    profileId: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}) {
    // Verify profile belongs to user
    const profile = await repo.findProfileByIdAndUserId(params.profileId, params.userId);
    if (!profile) {
        throw new ServiceError(403, { error: "Profile not found or access denied" });
    }

    const rawTz = profile.user.timeZone;
    const userTimeZone = (rawTz && rawTz.trim() !== "") ? rawTz.replace(/['"]+/g, '').trim() : "Asia/Bangkok";

    let startUtc: Date | undefined = undefined;
    let endUtc: Date | undefined = undefined;

    if (params.startDate) {
        // Create an absolute UTC date representation of the local time to bypass string parsing constraints
        const localDate = new Date(`${params.startDate}T00:00:00Z`);
        const offset = getNativeTimezoneOffset(userTimeZone, localDate);
        startUtc = new Date(localDate.getTime() - offset);
    }

    if (params.endDate) {
        const localDate = new Date(`${params.endDate}T23:59:59.999Z`);
        const offset = getNativeTimezoneOffset(userTimeZone, localDate);
        endUtc = new Date(localDate.getTime() - offset);
    }

    const logs = await repo.listLogsByProfileId(params.profileId, {
        startDate: startUtc,
        endDate: endUtc,
        limit: params.limit,
        offset: params.offset,
    });

    return { logs };
}

// ---------- Get Single Log ----------

export async function getMedicationLogDetail(params: {
    userId: number;
    logId: number;
}) {
    const log = await repo.findLogById(params.logId);
    if (!log) {
        throw new ServiceError(404, { error: "Medication log not found" });
    }

    // Verify profile belongs to user
    const profile = await repo.findProfileByIdAndUserId(log.profileId, params.userId);
    if (!profile) {
        throw new ServiceError(403, { error: "Access denied" });
    }

    return { log };
}

// ---------- Handle Response ----------

export async function handleMedicationResponse(params: {
    userId: number;
    logId: number;
    responseStatus: ResponseStatus;
    note?: string;
}) {
    const log = await repo.findLogById(params.logId);
    if (!log) {
        throw new ServiceError(404, { error: "Medication log not found" });
    }

    // Verify profile belongs to user
    const profile = await repo.findProfileByIdAndUserId(log.profileId, params.userId);
    if (!profile) {
        throw new ServiceError(403, { error: "Access denied" });
    }

    const now = new Date();
    const currentSnoozedCount = log.snoozedCount ?? 0;

    // Handle SNOOZE
    if (params.responseStatus === "SNOOZE") {
        // Check if we are about to hit the 3rd snooze (0-indexed so count == 2)
        if (currentSnoozedCount >= 2) {
            // Auto-skip since we've reached max snoozes
            const updatedLog = await repo.updateLogResponse(params.logId, {
                responseStatus: "SKIP",
                responseAt: now,
                snoozedCount: currentSnoozedCount + 1,
                nextSnoozeAt: null,
                note: params.note ?? "ข้ามอัตโนมัติ: ถึงขีดจำกัดการเลื่อนแจ้งเตือนสูงสุดแล้ว",
            });

            return {
                log: updatedLog,
                message: "Maximum snooze limit reached. Status set to SKIP.",
                wasAutoSkipped: true,
            };
        }

        // Calculate next snooze time
        const nextSnoozeAt = new Date(now.getTime() + SNOOZE_INTERVAL_MS);
        nextSnoozeAt.setSeconds(0, 0); // truncate seconds so cron trigger works exactly at the 5-minute minute mark

        const updatedLog = await repo.updateLogResponse(params.logId, {
            responseStatus: "SNOOZE",
            responseAt: now,
            snoozedCount: currentSnoozedCount + 1,
            nextSnoozeAt,
            note: params.note,
        });

        return {
            log: updatedLog,
            message: `Snoozed successfully. Reminder ${currentSnoozedCount + 1}/${MAX_SNOOZE_COUNT}.`,
            nextReminderAt: nextSnoozeAt.toISOString(),
            snoozedCount: currentSnoozedCount + 1,
        };
    }

    // Handle TAKE or SKIP
    const updatedLog = await repo.updateLogResponse(params.logId, {
        responseStatus: params.responseStatus,
        responseAt: now,
        nextSnoozeAt: null, // Clear any pending snooze
        note: params.note,
    });

    return {
        log: updatedLog,
        message: `Response recorded: ${params.responseStatus}`,
    };
}

// ---------- Note ----------

export async function updateMedicationLogNote(params: {
    userId: number;
    logId: number;
    note: string;
}) {
    const log = await repo.findLogById(params.logId);
    if (!log) {
        throw new ServiceError(404, { error: "Medication log not found" });
    }

    // Verify profile belongs to user
    const profile = await repo.findProfileByIdAndUserId(log.profileId, params.userId);
    if (!profile) {
        throw new ServiceError(403, { error: "Access denied" });
    }

    const updatedLog = await repo.updateLogNote(params.logId, params.note);

    return {
        log: updatedLog,
        message: "Note updated successfully",
    };
}
