import { prisma } from "@/server/db/client";
import { RelationshipStatus } from "@prisma/client";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

// ---------- User Lookup ----------

export async function findUserByEmail(email: string) {
    // Only users who have at least one profile (active mobile users) can be found
    return prisma.userAccount.findFirst({
        where: {
            email: email.toLowerCase().trim(),
            profiles: { some: {} } // Must have at least one mobile profile
        },
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
            // Allow Admins to be searched ONLY IF they use the mobile app (they have a profile)
            profiles: { some: {} }
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
    receiverEmail: string;
    profileIds: number[];
    viewerNickname?: string;
    viewerPicture?: string;
}) {
    return prisma.userRelationship.create({
        data: {
            ownerUserId: data.ownerUserId,
            viewerUserId: data.viewerUserId,
            receiverEmail: data.receiverEmail,
            profileIds: data.profileIds,
            status: "PENDING",
            viewerNickname: data.viewerNickname,
            viewerPicture: data.viewerPicture,
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
            viewerUser: {
                select: { userId: true, email: true, timeZone: true },
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

export async function updateRelationshipDetails(
    relationshipId: number,
    data: { viewerNickname?: string; viewerPicture?: string; profileIds?: number[] }
) {
    return prisma.userRelationship.update({
        where: { relationshipId },
        data: {
            ...(data.viewerNickname !== undefined && { viewerNickname: data.viewerNickname }),
            ...(data.viewerPicture !== undefined && { viewerPicture: data.viewerPicture }),
            ...(data.profileIds !== undefined && { profileIds: data.profileIds }),
        },
    });
}

export async function updateFollowingDetails(
    relationshipId: number,
    data: { ownerNickname?: string; ownerPicture?: string }
) {
    return prisma.userRelationship.update({
        where: { relationshipId },
        data: {
            ...(data.ownerNickname !== undefined && { ownerNickname: data.ownerNickname }),
            ...(data.ownerPicture !== undefined && { ownerPicture: data.ownerPicture }),
        },
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
                            mediTradeName: true,
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

// ---------- Regimen Queries ----------

export async function findRegimensByProfileId(profileId: number) {
    return prisma.userMedicineRegimen.findMany({
        where: {
            medicineList: {
                profileId,
            },
        },
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
            times: {
                orderBy: { timeOfDay: "asc" },
            },
        },
        orderBy: { mediRegimenId: "desc" },
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

export async function updateRelationshipViewerPicture(relationshipId: number, pictureUrl: string) {
    return prisma.userRelationship.update({
        where: { relationshipId },
        data: { viewerPicture: pictureUrl },
    });
}

export async function updateRelationshipOwnerPicture(relationshipId: number, pictureUrl: string) {
    return prisma.userRelationship.update({
        where: { relationshipId },
        data: { ownerPicture: pictureUrl },
    });
}

export async function deleteOldPicture(picturePath: string | null | undefined) {
    if (!picturePath) return;
    // Only delete files in our uploads directory
    if (!picturePath.startsWith("/uploads/user-relationship-picture/")) return;

    try {
        const fullPath = join(process.cwd(), "public", picturePath);
        await unlink(fullPath);
    } catch {
        // File might not exist, ignore silently
    }
}

// ---------- Cleanup Operations ----------

export async function removeProfileFromAllRelationships(profileId: number) {
    // 1. Find all relationships that *might* contain this profileId.
    // Using array_contains if supported by Prisma+MySQL, or fallback to fetching potential matches.
    // Since we want to be safe and `profileIds` is a JSON array of numbers:

    // We'll fetch all relationships where profileIds is not null, then filter and update in memory loop.
    // This is safer than relying on JSON syntax nuances across Prisma versions without running tests.
    // Also, usually the number of relationships referencing a single profile is small (just followers).

    // Optimisation: We can try to filter by string containment of the ID to reduce set size.
    // e.g. contains `"${profileId}"` or just `${profileId}`.
    // But basic "findMany" is safest.

    const allRelationships = await prisma.userRelationship.findMany({
        where: {
            status: { in: ["APPROVED", "PENDING"] },
            // We'll filter profileIds in memory since strictly typed Prisma JSON filtering can be tricky with nulls
        },
    });

    const updates = [];

    for (const rel of allRelationships) {
        const ids = rel.profileIds as number[] | null;
        if (Array.isArray(ids) && ids.includes(profileId)) {
            const newIds = ids.filter((id) => id !== profileId);
            updates.push(
                prisma.userRelationship.update({
                    where: { relationshipId: rel.relationshipId },
                    data: { profileIds: newIds },
                })
            );
        }
    }

    if (updates.length > 0) {
        await prisma.$transaction(updates);
    }
}
