// server/medicineList/medicineList.repository.ts
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

// ---------- DB queries ----------

export async function findProfileByIdAndUserId(profileId: number, userId: number) {
  return prisma.userProfile.findFirst({
    where: { profileId, userId },
  });
}

export async function findMedicineById(mediId: number) {
  return prisma.medicineDatabase.findFirst({
    where: { mediId, mediStatus: true },
  });
}

export async function findMedicineListByProfileAndMediId(profileId: number, mediId: number | null) {
  if (mediId === null) return null; // No duplicate check needed for unlinked items
  return prisma.medicineList.findFirst({
    where: { profileId, mediId },
  });
}

export async function findMedicineListById(mediListId: number) {
  return prisma.medicineList.findUnique({
    where: { mediListId },
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
  });
}

export async function createMedicineListRow(params: {
  profileId: number;
  mediId?: number | null; // Optional: can create without linking to medicine database
  mediNickname?: string | null;
  pictureOption?: string | null;
}) {
  return prisma.medicineList.create({
    data: {
      profileId: params.profileId,
      mediId: params.mediId ?? null,
      mediNickname: params.mediNickname ?? null,
      pictureOption: params.pictureOption ?? null,
    },
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
  });
}

export async function listMedicineListByProfileId(profileId: number) {
  return prisma.medicineList.findMany({
    where: { profileId },
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
    orderBy: { mediListId: "asc" },
  });
}

export async function updateMedicineListRow(
  mediListId: number,
  data: { mediId?: number | null; mediNickname?: string | null; pictureOption?: string | null }
) {
  return prisma.medicineList.update({
    where: { mediListId },
    data,
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
  });
}

export async function deleteMedicineListRow(mediListId: number) {
  return prisma.medicineList.delete({
    where: { mediListId },
  });
}

export async function deleteMedicineListCascade(mediListId: number) {
  return prisma.$transaction(async (tx) => {
    // 1. Delete MedicationLogs related to this medicine list item
    await tx.medicationLog.deleteMany({
      where: { mediListId },
    });

    // 2. Find all regimens for this medicine list item
    const regimens = await tx.userMedicineRegimen.findMany({
      where: { mediListId },
      select: { mediRegimenId: true },
    });

    const regimenIds = regimens.map((r) => r.mediRegimenId);

    if (regimenIds.length > 0) {
      // 3. Delete all regimen times
      await tx.userMedicineRegimenTime.deleteMany({
        where: { mediRegimenId: { in: regimenIds } },
      });

      // 4. Delete the regimens themselves
      await tx.userMedicineRegimen.deleteMany({
        where: { mediRegimenId: { in: regimenIds } },
      });
    }

    // 5. Finally, delete the MedicineList item
    return tx.medicineList.delete({
      where: { mediListId },
    });
  });
}

// ---------- File IO helpers ----------

/**
 * Saves picture file under: public/uploads/medicine_database/medicine_option/{profileId}/
 * Returns full URL path like: /uploads/medicine_database/medicine_option/12/1700000000.png
 */
export async function saveMedicineListPicture(
  file: { buffer: Buffer; originalFilename: string },
  profileId: number
): Promise<string> {
  const uploadDir = join(
    process.cwd(),
    "public",
    "uploads",
    "medicine_database",
    "medicine_option",
    String(profileId)
  );
  await mkdir(uploadDir, { recursive: true });

  const timestamp = Date.now();
  const extension = file.originalFilename.split(".").pop() || "jpg";
  const fileName = `${timestamp}.${extension}`;
  const filePath = join(uploadDir, fileName);

  await writeFile(filePath, file.buffer);

  return `/uploads/medicine_database/medicine_option/${profileId}/${fileName}`;
}

/**
 * Deletes picture file from disk. Does not throw if file is missing.
 * Only deletes files inside public/uploads/medicine_database/medicine_option/
 */
export async function deleteMedicineListPictureFile(urlPath: string | null | undefined) {
  if (!urlPath) return;

  try {
    // urlPath looks like "/uploads/medicine_database/medicine_option/12/123.jpg"
    let relativePath = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;

    // Safety: only delete inside medicine_option folder
    if (!relativePath.startsWith("uploads/medicine_database/medicine_option/")) {
      console.warn("Refusing to delete file outside medicine_option folder:", urlPath);
      return;
    }

    const fullPath = join(process.cwd(), "public", relativePath);
    await unlink(fullPath);
  } catch (error) {
    // do not crash if file missing
    console.error("Could not delete medicine list picture file:", error);
  }
}




