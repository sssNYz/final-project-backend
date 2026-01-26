// server/medicineList/medicineList.service.ts
import { ServiceError } from "@/server/common/errors";
import {
  findProfileByIdAndUserId,
  findMedicineById,
  findMedicineListByProfileAndMediId,
  findMedicineListById,
  createMedicineListRow,
  listMedicineListByProfileId,
  updateMedicineListRow,
  deleteMedicineListRow,
  saveMedicineListPicture,
  deleteMedicineListPictureFile,
} from "./medicineList.repository";

// ---------- helpers ----------

const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateImageFile(file: { buffer: Buffer; originalFilename: string }) {
  const ext = file.originalFilename.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new ServiceError(400, {
      error: "Only image files are allowed (jpg, jpeg, png, webp)",
    });
  }
  if (file.buffer.length > MAX_FILE_SIZE) {
    throw new ServiceError(400, {
      error: "File size must be less than 5MB",
    });
  }
}

// ---------- CREATE ----------

export async function createMedicineListItem(params: {
  userId: number;
  profileId: number;
  mediId?: number | null; // Optional: can create without linking to medicine database
  mediNickname?: string | null;
  pictureFile?: { buffer: Buffer; originalFilename: string } | null;
}) {
  const { userId, profileId, mediId, mediNickname, pictureFile } = params;

  // 1) Check profile belongs to user
  const profile = await findProfileByIdAndUserId(profileId, userId);
  if (!profile) {
    throw new ServiceError(404, { error: "Profile not found or not yours" });
  }

  // 2) If mediId provided, check medicine exists and check for duplicates
  if (mediId != null) {
    const medicine = await findMedicineById(mediId);
    if (!medicine) {
      throw new ServiceError(404, { error: "Medicine not found" });
    }

    // Check duplicate (profileId + mediId)
    const existing = await findMedicineListByProfileAndMediId(profileId, mediId);
    if (existing) {
      throw new ServiceError(409, {
        error: "This medicine already exists in this profile",
        existingMediListId: existing.mediListId,
      });
    }
  }

  // 3) Save picture if provided
  let pictureOptionPath: string | null = null;
  if (pictureFile) {
    validateImageFile(pictureFile);
    pictureOptionPath = await saveMedicineListPicture(pictureFile, profileId);
  }

  // 4) Create row
  const created = await createMedicineListRow({
    profileId,
    mediId: mediId ?? null,
    mediNickname: mediNickname ?? null,
    pictureOption: pictureOptionPath,
  });

  return {
    mediListId: created.mediListId,
    profileId: created.profileId,
    mediId: created.mediId,
    mediNickname: created.mediNickname,
    pictureOption: created.pictureOption,
    medicine: created.medicine,
  };
}

// ---------- LIST ----------

export async function listMedicineListItems(params: { userId: number; profileId: number }) {
  const { userId, profileId } = params;

  // Check profile belongs to user
  const profile = await findProfileByIdAndUserId(profileId, userId);
  if (!profile) {
    throw new ServiceError(404, { error: "Profile not found or not yours" });
  }

  const items = await listMedicineListByProfileId(profileId);

  return {
    items: items.map((item) => ({
      mediListId: item.mediListId,
      profileId: item.profileId,
      mediId: item.mediId,
      mediNickname: item.mediNickname,
      pictureOption: item.pictureOption,
      medicine: item.medicine,
    })),
  };
}

// ---------- UPDATE ----------

export async function updateMedicineListItem(params: {
  userId: number;
  mediListId: number;
  mediId?: number | null; // Can link or unlink medicine (null to unlink)
  mediNickname?: string | null;
  pictureFile?: { buffer: Buffer; originalFilename: string } | null;
}) {
  const { userId, mediListId, mediId, mediNickname, pictureFile } = params;

  // 1) Find item
  const existing = await findMedicineListById(mediListId);
  if (!existing) {
    throw new ServiceError(404, { error: "Medicine list item not found" });
  }

  // 2) Check profile belongs to user
  const profile = await findProfileByIdAndUserId(existing.profileId, userId);
  if (!profile) {
    throw new ServiceError(403, { error: "Not allowed to update this item" });
  }

  // 3) Build update data
  const updateData: { mediId?: number | null; mediNickname?: string | null; pictureOption?: string | null } = {};

  // Handle mediId update (linking/unlinking medicine)
  if (mediId !== undefined) {
    if (mediId !== null) {
      // Linking to a medicine - validate it exists
      const medicine = await findMedicineById(mediId);
      if (!medicine) {
        throw new ServiceError(404, { error: "Medicine not found" });
      }

      // Check duplicate (profileId + mediId) - but skip if same medicine
      if (mediId !== existing.mediId) {
        const duplicate = await findMedicineListByProfileAndMediId(existing.profileId, mediId);
        if (duplicate) {
          throw new ServiceError(409, {
            error: "This medicine already exists in this profile",
            existingMediListId: duplicate.mediListId,
          });
        }
      }
    }
    updateData.mediId = mediId;
  }

  // update nickname if provided (can set to null or empty)
  if (mediNickname !== undefined) {
    updateData.mediNickname = mediNickname;
  }

  // update picture if file uploaded
  let oldPicturePath: string | null = null;
  if (pictureFile) {
    validateImageFile(pictureFile);
    oldPicturePath = existing.pictureOption;
    updateData.pictureOption = await saveMedicineListPicture(pictureFile, existing.profileId);
  }

  // nothing to update?
  if (Object.keys(updateData).length === 0) {
    throw new ServiceError(400, { error: "No fields to update" });
  }

  // 4) Update row
  const updated = await updateMedicineListRow(mediListId, updateData);

  // 5) Delete old picture file (best-effort)
  if (oldPicturePath && oldPicturePath !== updated.pictureOption) {
    await deleteMedicineListPictureFile(oldPicturePath);
  }

  return {
    mediListId: updated.mediListId,
    profileId: updated.profileId,
    mediId: updated.mediId,
    mediNickname: updated.mediNickname,
    pictureOption: updated.pictureOption,
    medicine: updated.medicine,
  };
}

// ---------- DELETE ----------

export async function deleteMedicineListItem(params: { userId: number; mediListId: number }) {
  const { userId, mediListId } = params;

  // 1) Find item
  const existing = await findMedicineListById(mediListId);
  if (!existing) {
    throw new ServiceError(404, { error: "Medicine list item not found" });
  }

  // 2) Check profile belongs to user
  const profile = await findProfileByIdAndUserId(existing.profileId, userId);
  if (!profile) {
    throw new ServiceError(403, { error: "Not allowed to delete this item" });
  }

  // 3) Delete picture file (best-effort)
  await deleteMedicineListPictureFile(existing.pictureOption);

  // 4) Delete row
  await deleteMedicineListRow(mediListId);

  return { message: "Medicine list item deleted" };
}




