// server/follow/follow.repository.ts
import { prisma } from "@/server/db/client";
import { RelationshipStatus } from "@prisma/client";

// ---------- User Lookup ----------

export async function findUserByEmail(email: string) {
    return prisma.userAccount.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
            userId: true,
            email: true,
        },
    });
}

// ---------- Relationship CRUD ----------

export async function createRelationship(data: {
    ownerUserId: number;
    viewerUserId: number;
    isReceiverEmail: string;
    profileIds: number[];
}) {
    return prisma.userRelationship.create({
        data: {
            ownerUserId: data.ownerUserId,
            viewerUserId: data.viewerUserId,
            isReceiverEmail: data.isReceiverEmail,
            profileIds: data.profileIds,
            status: "PENDING",
        },
    });
}

export async function findRelationshipById(relationshipId: number) {
    return prisma.userRelationship.findUnique({
        where: { relationshipId },
        include: {
            ownerUser: {
                select: { userId: true, email: true },
            },
            viewerUser: {
                select: { userId: true, email: true },
            },
        },
    });
}

export async function findExistingRelationship(ownerUserId: number, viewerUserId: number) {
    return prisma.userRelationship.findFirst({
        where: {
            ownerUserId,
            viewerUserId,
            status: { in: ["PENDING", "APPROVED"] },
        },
    });
}

// ---------- Owner (Sender) Queries ----------

export async function findFollowersByOwner(ownerUserId: number) {
    return prisma.userRelationship.findMany({
        where: {
            ownerUserId,
            status: { in: ["PENDING", "APPROVED"] },
        },
        include: {
            viewerUser: {
                select: { userId: true, email: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function findRelationshipByIdAndOwner(relationshipId: number, ownerUserId: number) {
    return prisma.userRelationship.findFirst({
        where: {
            relationshipId,
            ownerUserId,
        },
    });
}

// ---------- Viewer (Follower) Queries ----------

export async function findPendingInvitesByViewer(viewerUserId: number) {
    return prisma.userRelationship.findMany({
        where: {
            viewerUserId,
            status: "PENDING",
        },
        include: {
            ownerUser: {
                select: { userId: true, email: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function findFollowingByViewer(viewerUserId: number) {
    return prisma.userRelationship.findMany({
        where: {
            viewerUserId,
            status: "APPROVED",
        },
        include: {
            ownerUser: {
                select: { userId: true, email: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function findRelationshipByIdAndViewer(relationshipId: number, viewerUserId: number) {
    return prisma.userRelationship.findFirst({
        where: {
            relationshipId,
            viewerUserId,
        },
        include: {
            ownerUser: {
                select: { userId: true, email: true },
            },
        },
    });
}

// ---------- Update Operations ----------

export async function updateRelationshipStatus(relationshipId: number, status: RelationshipStatus) {
    return prisma.userRelationship.update({
        where: { relationshipId },
        data: { status },
    });
}

export async function updateRelationshipProfiles(relationshipId: number, profileIds: number[]) {
    return prisma.userRelationship.update({
        where: { relationshipId },
        data: { profileIds },
    });
}

// ---------- Profile Queries ----------

export async function findProfilesByOwner(ownerUserId: number) {
    return prisma.userProfile.findMany({
        where: { userId: ownerUserId },
        select: {
            profileId: true,
            profileName: true,
            profilePicture: true,
        },
    });
}

export async function findProfilesByIds(profileIds: number[]) {
    return prisma.userProfile.findMany({
        where: { profileId: { in: profileIds } },
        select: {
            profileId: true,
            profileName: true,
            profilePicture: true,
            userId: true,
        },
    });
}

// ---------- Medication Log Queries (for followers) ----------

export async function findMedicationLogsByProfileId(
    profileId: number,
    options: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }
) {
    return prisma.medicationLog.findMany({
        where: {
            profileId,
            ...(options.startDate || options.endDate
                ? {
                    scheduleTime: {
                        ...(options.startDate ? { gte: options.startDate } : {}),
                        ...(options.endDate ? { lte: options.endDate } : {}),
                    },
                }
                : {}),
        },
        include: {
            medicineList: {
                select: {
                    mediListId: true,
                    mediNickname: true,
                    medicine: {
                        select: {
                            mediThName: true,
                            mediEnName: true,
                        },
                    },
                },
            },
        },
        orderBy: { scheduleTime: "desc" },
        take: options.limit,
        skip: options.offset,
    });
}
