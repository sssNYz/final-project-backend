// server/medicationLog/medicationLog.repository.ts
import { prisma } from "@/lib/prisma";
import { ResponseStatus } from "@prisma/client";

// ---------- Helper ----------

export async function findProfileByIdAndUserId(profileId: number, userId: number) {
    return prisma.userProfile.findFirst({
        where: { profileId, userId },
    });
}

// ---------- Queries ----------

export async function findLogById(logId: number) {
    return prisma.medicationLog.findUnique({
        where: { logId },
        include: {
            profile: {
                select: {
                    profileId: true,
                    profileName: true,
                    userId: true,
                },
            },
            medicineList: {
                include: {
                    medicine: {
                        select: {
                            mediId: true,
                            mediThName: true,
                            mediEnName: true,
                            mediTradeName: true,
                            mediType: true,
                            mediPicture: true,
                        },
                    },
                },
            },
        },
    });
}

export async function listLogsByProfileId(
    profileId: number,
    options?: {
        startDate?: Date;
        endDate?: Date;
        responseStatus?: ResponseStatus | null;
        limit?: number;
        offset?: number;
    }
) {
    const where: {
        profileId: number;
        scheduleTime?: { gte?: Date; lte?: Date };
        responseStatus?: ResponseStatus | null;
    } = { profileId };

    // Date filtering
    if (options?.startDate || options?.endDate) {
        where.scheduleTime = {};
        if (options?.startDate) {
            where.scheduleTime.gte = options.startDate;
        }
        if (options?.endDate) {
            where.scheduleTime.lte = options.endDate;
        }
    }

    // Response status filter (null means not responded yet)
    if (options?.responseStatus !== undefined) {
        where.responseStatus = options.responseStatus;
    }

    return prisma.medicationLog.findMany({
        where,
        include: {
            medicineList: {
                include: {
                    medicine: {
                        select: {
                            mediId: true,
                            mediThName: true,
                            mediEnName: true,
                            mediTradeName: true,
                            mediType: true,
                            mediPicture: true,
                        },
                    },
                },
            },
        },
        orderBy: { scheduleTime: "desc" },
        take: options?.limit ?? 100,
        skip: options?.offset ?? 0,
    });
}

export async function updateLogResponse(
    logId: number,
    data: {
        responseStatus: ResponseStatus;
        responseAt: Date;
        snoozedCount?: number;
        nextSnoozeAt?: Date | null;
        note?: string | null;
    }
) {
    return prisma.medicationLog.update({
        where: { logId },
        data: {
            responseStatus: data.responseStatus,
            responseAt: data.responseAt,
            snoozedCount: data.snoozedCount,
            nextSnoozeAt: data.nextSnoozeAt,
            note: data.note,
        },
        include: {
            medicineList: {
                include: {
                    medicine: {
                        select: {
                            mediId: true,
                            mediThName: true,
                            mediEnName: true,
                        },
                    },
                },
            },
        },
    });
}

// ---------- Snooze Worker Queries ----------

export async function findLogsForSnoozeReminder() {
    const now = new Date();
    return prisma.medicationLog.findMany({
        where: {
            responseStatus: "SNOOZE",
            nextSnoozeAt: { lte: now },
            snoozedCount: { lt: 3 },
        },
        include: {
            profile: {
                select: {
                    profileId: true,
                    userId: true,
                    user: {
                        select: {
                            userId: true,
                            timeZone: true,
                        },
                    },
                },
            },
            medicineList: {
                select: {
                    mediListId: true,
                    mediNickname: true,
                    medicine: {
                        select: {
                            mediEnName: true,
                            mediThName: true,
                        },
                    },
                },
            },
        },
    });
}

export async function updateLogAfterSnoozeReminder(
    logId: number,
    data: {
        nextSnoozeAt: Date | null;
        pushSentAt: Date;
    }
) {
    return prisma.medicationLog.update({
        where: { logId },
        data: {
            nextSnoozeAt: data.nextSnoozeAt,
            pushSentAt: data.pushSentAt,
        },
    });
}

export async function markLogAsAutoSkipped(logId: number) {
    return prisma.medicationLog.update({
        where: { logId },
        data: {
            responseStatus: "SKIP",
            responseAt: new Date(),
            nextSnoozeAt: null,
            note: "Auto-skipped after 3 snooze reminders",
        },
    });
}
