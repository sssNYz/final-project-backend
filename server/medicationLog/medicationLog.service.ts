// server/medicationLog/medicationLog.service.ts
import { ResponseStatus } from "@prisma/client";
import { ServiceError } from "@/server/common/errors";
import * as repo from "./medicationLog.repository";

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

    const logs = await repo.listLogsByProfileId(params.profileId, {
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        endDate: params.endDate ? new Date(params.endDate) : undefined,
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
        // Check if max snoozes reached
        if (currentSnoozedCount >= MAX_SNOOZE_COUNT) {
            // Auto-skip since we've reached max snoozes
            const updatedLog = await repo.updateLogResponse(params.logId, {
                responseStatus: "SKIP",
                responseAt: now,
                nextSnoozeAt: null,
                note: params.note ?? "Auto-skipped: maximum snooze limit reached",
            });

            return {
                log: updatedLog,
                message: "Maximum snooze limit reached. Status set to SKIP.",
                wasAutoSkipped: true,
            };
        }

        // Calculate next snooze time
        const nextSnoozeAt = new Date(now.getTime() + SNOOZE_INTERVAL_MS);

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
