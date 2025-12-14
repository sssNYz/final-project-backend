// server/medicine/medicine.service.ts
import { User } from "@supabase/supabase-js";
import { MedicineType, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import { ServiceError } from "@/server/common/errors";
import {
  createMedicine,
  listMedicines,
  findMedicineById,
  updateMedicine,
  softDeleteMedicine,
  countMedicines,
} from "@/server/medicine/medicine.repository";
import { findUserBySupabaseOrEmail } from "@/server/users/users.repository";

function normalizeEmail(email?: string | null): string | null {
  return typeof email === "string" ? email.toLowerCase().trim() : null;
}

function getSafeMedicineUploadAbsolutePath(
  storedPath: string
): { absolutePath: string; uploadsDir: string } | null {
  // We only delete files inside: public/uploads/medicine_database/
  // Accept stored paths like:
  // - "uploads/medicine_database/xxx.png"
  // - "/uploads/medicine_database/xxx.png"
  let rel = storedPath.trim();
  if (!rel) return null;

  // Never delete remote URLs
  if (rel.startsWith("http://") || rel.startsWith("https://")) return null;

  // Remove leading "/" if present
  if (rel.startsWith("/")) rel = rel.slice(1);

  const uploadsDir = path.resolve(
    process.cwd(),
    "public",
    "uploads",
    "medicine_database"
  );

  // Build an absolute path from "public/<rel>"
  const absolutePath = path.resolve(process.cwd(), "public", rel);

  // Safety: must be under uploadsDir (prevents path traversal)
  const uploadsDirWithSep = uploadsDir.endsWith(path.sep)
    ? uploadsDir
    : uploadsDir + path.sep;
  if (!absolutePath.startsWith(uploadsDirWithSep)) return null;

  return { absolutePath, uploadsDir };
}

async function getCurrentAdminOrThrow(supabaseUser: User) {
  const normalizedEmail = normalizeEmail(supabaseUser.email);
  const user = await findUserBySupabaseOrEmail(
    supabaseUser.id,
    normalizedEmail
  );

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found in database",
      message: "Please sync your admin account first.",
    });
  }

  if (user.role !== "Admin" && user.role !== "SuperAdmin") {
    throw new ServiceError(403, {
      error: "Forbidden",
      message: "You are not allowed to manage medicines.",
    });
  }

  return user;
}

// ---------- CREATE ----------

export interface CreateMedicineInput {
  mediThName: string;
  mediEnName: string;
  mediTradeName?: string | null;
  mediType: MedicineType;
  mediUse?: string | null;
  mediGuide?: string | null;
  mediEffects?: string | null;
  mediNoUse?: string | null;
  mediWarning?: string | null;
  mediStore?: string | null;
  mediPicturePath?: string | null; // like "uploads/medicine_database/xxx.jpg"
}

export async function createMedicineForAdmin({
  supabaseUser,
  input,
}: {
  supabaseUser: User;
  input: CreateMedicineInput;
}) {
  const admin = await getCurrentAdminOrThrow(supabaseUser);

  if (!input.mediThName || !input.mediEnName) {
    throw new ServiceError(400, {
      error: "ชื่อยาต้องไม่ว่างเปล่า",
      fields: ["mediThName", "mediEnName"],
    });
  }

  const data: Prisma.MedicineDatabaseCreateInput = {
    mediThName: input.mediThName,
    mediEnName: input.mediEnName,
    mediTradeName: input.mediTradeName ?? null,
    mediType: input.mediType,
    mediUse: input.mediUse ?? null,
    mediGuide: input.mediGuide ?? null,
    mediEffects: input.mediEffects ?? null,
    mediNoUse: input.mediNoUse ?? null,
    mediWarning: input.mediWarning ?? null,
    mediStore: input.mediStore ?? null,
    mediPicture: input.mediPicturePath ?? null,
    adminId: admin.userId,
  };

  const created = await createMedicine(data);

  return {
    message: "Medicine created",
    medicine: created,
  };
}

// ---------- LIST ----------

export async function listMedicinesForAdmin({
  supabaseUser,
  search,
  type,
  page = 1,
  pageSize = 10,
  order = "asc",
  includeDeleted = false,
}: {
  supabaseUser: User;
  search?: string | null;
  type?: MedicineType | null;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
  includeDeleted?: boolean;
}) {
  await getCurrentAdminOrThrow(supabaseUser);

  const currentPage = page > 0 ? page : 1;
  const take = pageSize > 0 ? pageSize : 10;
  const skip = (currentPage - 1) * take;

  const { items, total } = await listMedicines({
    search: search ?? undefined,
    type: type ?? undefined,
    orderByName: order,
    includeDeleted,
    skip,
    take,
  });

  return {
    items,
    meta: {
      page: currentPage,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}

// ---------- DETAIL ----------

export async function getMedicineDetailForAdmin({
  supabaseUser,
  mediId,
}: {
  supabaseUser: User;
  mediId: number;
}) {
  await getCurrentAdminOrThrow(supabaseUser);

  if (!Number.isInteger(mediId) || mediId <= 0) {
    throw new ServiceError(400, { error: "mediId must be a positive integer" });
  }

  const medicine = await findMedicineById(mediId);
  if (!medicine || medicine.deletedAt) {
    throw new ServiceError(404, { error: "Medicine not found" });
  }

  return { medicine };
}

// ---------- COUNT ----------

export async function getMedicineCountForAdmin({
  supabaseUser,
  includeDeleted = false,
}: {
  supabaseUser: User;
  includeDeleted?: boolean;
}) {
  await getCurrentAdminOrThrow(supabaseUser);

  const total = await countMedicines({ includeDeleted });
  return { total };
}

// ---------- UPDATE ----------

export interface UpdateMedicineInput {
  mediId: number;
  mediThName?: string;
  mediEnName?: string;
  mediTradeName?: string | null;
  mediType?: MedicineType;
  mediUse?: string | null;
  mediGuide?: string | null;
  mediEffects?: string | null;
  mediNoUse?: string | null;
  mediWarning?: string | null;
  mediStore?: string | null;
  mediPicturePath?: string | null; // if new image uploaded
}

export async function updateMedicineForAdmin({
  supabaseUser,
  input,
}: {
  supabaseUser: User;
  input: UpdateMedicineInput;
}) {
  const admin = await getCurrentAdminOrThrow(supabaseUser);

  const existing = await findMedicineById(input.mediId);
  if (!existing || existing.deletedAt) {
    throw new ServiceError(404, { error: "Medicine not found" });
  }

  const oldPicturePath = existing.mediPicture;
  const newPicturePath =
    input.mediPicturePath !== undefined ? input.mediPicturePath : undefined;

  const data: Prisma.MedicineDatabaseUpdateInput = {
    adminId: admin.userId,
  };

  if (input.mediThName !== undefined) data.mediThName = input.mediThName;
  if (input.mediEnName !== undefined) data.mediEnName = input.mediEnName;
  if (input.mediTradeName !== undefined) data.mediTradeName = input.mediTradeName;
  if (input.mediType !== undefined) data.mediType = input.mediType;
  if (input.mediUse !== undefined) data.mediUse = input.mediUse;
  if (input.mediGuide !== undefined) data.mediGuide = input.mediGuide;
  if (input.mediEffects !== undefined) data.mediEffects = input.mediEffects;
  if (input.mediNoUse !== undefined) data.mediNoUse = input.mediNoUse;
  if (input.mediWarning !== undefined) data.mediWarning = input.mediWarning;
  if (input.mediStore !== undefined) data.mediStore = input.mediStore;
  if (input.mediPicturePath !== undefined) {
    data.mediPicture = input.mediPicturePath;
  }

  const updated = await updateMedicine(input.mediId, data);

  // Option A: if picture changed, delete old file (best-effort)
  // - Only deletes files inside public/uploads/medicine_database/
  // - If deletion fails, we do not fail the API
  if (
    newPicturePath !== undefined &&
    typeof oldPicturePath === "string" &&
    oldPicturePath.trim() !== "" &&
    oldPicturePath !== newPicturePath
  ) {
    const safe = getSafeMedicineUploadAbsolutePath(oldPicturePath);
    if (safe) {
      try {
        await fs.promises.unlink(safe.absolutePath);
      } catch (err: unknown) {
        // Ignore "file not found" and other filesystem errors (best-effort cleanup)
        console.warn("Failed to delete old medicine picture:", {
          mediId: input.mediId,
          oldPicturePath,
          error: err,
        });
      }
    }
  }

  return {
    message: "Medicine updated",
    medicine: updated,
  };
}

// ---------- DELETE (SOFT) ----------

export async function deleteMedicineForAdmin({
  supabaseUser,
  mediId,
}: {
  supabaseUser: User;
  mediId: number;
}) {
  const admin = await getCurrentAdminOrThrow(supabaseUser);

  const existing = await findMedicineById(mediId);
  if (!existing || existing.deletedAt) {
    throw new ServiceError(404, { error: "Medicine not found" });
  }

  await softDeleteMedicine(mediId, admin.userId);

  return {
    message: "Medicine deleted",
  };
}