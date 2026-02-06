import { prisma } from "@/server/db/client";
import { RelationshipStatus } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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

export async function searchUsersByEmailPartial(query: string) {
    return prisma.userAccount.findMany({
        where: {
            email: {
                contains: query.toLowerCase().trim(),
            },
            role: "User",
        },
        select: {
            email: true,
        },
        take: 10,
    });
}

// ---------- Relationship CRUD ----------

export async function createRelationship(data: {
    ownerUserId: number;
    viewerUserId: number;
    isReceiverEmail: string;
    profileIds: number[];
    name?: string;
    accountPicture?: string;
}) {
    return prisma.userRelationship.create({
        data: {
            ownerUserId: data.ownerUserId,
            viewerUserId: data.viewerUserId,
            isReceiverEmail: data.isReceiverEmail,
            profileIds: data.profileIds,
            status: "PENDING",
            name: data.name,
            accountPicture: data.accountPicture,
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

// ---------- File Operations ----------

export async function saveRelationshipPicture(
    file: { buffer: Buffer; originalFilename: string },
    relationshipId: number,
    name?: string
) {
    const uploadDir = join(process.cwd(), "public", "uploads", "user-relationship-picture");
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const extension = file.originalFilename.split(".").pop() || "jpg";
    const sanitizedName = (name || "unnamed").replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${relationshipId}_${sanitizedName}_${timestamp}.${extension}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, file.buffer);

    return `/uploads/user-relationship-picture/${fileName}`;
}

export async function updateRelationshipPicture(relationshipId: number, pictureUrl: string) {
    return prisma.userRelationship.update({
        where: { relationshipId },
        data: { accountPicture: pictureUrl },
    });
}
