import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

export async function createUserProfile(params: {
    userId: number;
    profileName: string;
    profilePicture?: string | null;
}) {
    const { userId, profileName, profilePicture } = params;

    return prisma.userProfile.create({
        data: {
            userId,
            profileName,
            profilePicture: profilePicture ?? null,
        },
    });
}

export async function listProfilesByUserId(userId: number) {
    return prisma.userProfile.findMany({
        where: { userId },
        select: {
            profileId: true,
            profileName: true,
            profilePicture: true,
        },
        orderBy: {
            profileId: "asc",
        },
    });
}

export async function saveProfilePicture(
    file: { buffer: Buffer; originalFilename: string },
    userId: number
): Promise<string> {
    const uploadDir = join(process.cwd(), "public", "uploads", "profile-pictures");
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const extension = file.originalFilename.split(".").pop() || "jpg";
    const fileName = `${userId}_${timestamp}.${extension}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, file.buffer);

    return `/uploads/profile-pictures/${fileName}`;
}

export async function findProfileByIdAndUserId(profileId: number, userId: number) {
    return prisma.userProfile.findUnique({
        where: {
            profileId,
            userId
        },
    });
}

export async function updateUserProfile(profileId: number, data: { profileName?: string; profilePicture?: string | null }) {
    return prisma.userProfile.update({
        where: { profileId },
        data,
    })
}

export async function deleteUserProfile(profileId: number) {
    return prisma.userProfile.delete({
        where: { profileId }
    })
}

// Delete picture file from disk (ignore error if file is missing)
export async function deleteProfilePictureFile(urlPath: string | null | undefined) {
    // if there is no picture, nothing to delete
    if (!urlPath) return;

    try {
        // urlPath looks like "/uploads/profile-pictures/8_123.jpg"
        // remove first "/" → "uploads/profile-pictures/8_123.jpg"
        const relativePath = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;

        // build full path: "<project-root>/uploads/profile-pictures/8_123.jpg"
        const fullPath = join(process.cwd(), relativePath);

        await unlink(fullPath); // delete file from disk
    } catch (error) {
        // do not crash API if file missing
        console.error("Could not delete profile picture file:", error);
    }
}

export async function deleteUserProfileCascade(profileId: number) {
    // We need to delete:
    // 1. MedicationLog (profileId)
    // 2. UserMedicineRegimenTime -> linked to Regimen -> linked to MedicineList -> linked to Profile
    // 3. UserMedicineRegimen -> linked to MedicineList -> linked to Profile
    // 4. MedicineList (profileId)
    // 5. UserProfile (profileId)

    // A. Find all MedicineLists for this profile to get their IDs
    const mediLists = await prisma.medicineList.findMany({
        where: { profileId },
        select: { mediListId: true },
    });
    const mediListIds = mediLists.map((m) => m.mediListId);

    // B. Find all Regimens linked to these lists
    const regimens = await prisma.userMedicineRegimen.findMany({
        where: { mediListId: { in: mediListIds } },
        select: { mediRegimenId: true },
    });
    const regimenIds = regimens.map((r) => r.mediRegimenId);

    // Execute deletions in transaction
    return prisma.$transaction([
        // 1. Logs
        prisma.medicationLog.deleteMany({
            where: { profileId },
        }),

        // 2. Regimen Times
        prisma.userMedicineRegimenTime.deleteMany({
            where: { mediRegimenId: { in: regimenIds } },
        }),

        // 3. Regimens
        prisma.userMedicineRegimen.deleteMany({
            where: { mediListId: { in: mediListIds } },
        }),

        // 4. Medicine Lists
        prisma.medicineList.deleteMany({
            where: { profileId },
        }),

        // 5. The Profile itself
        prisma.userProfile.delete({
            where: { profileId },
        }),
    ]);
}