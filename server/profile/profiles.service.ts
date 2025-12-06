import { ServiceError } from "../common/errors";
import { 
    createUserProfile, 
    listProfilesByUserId, 
    saveProfilePicture,
    findProfileByIdAndUserId, 
    updateUserProfile, 
    deleteUserProfile,
    deleteProfilePictureFile } from "./profile.repository";

function toStringOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function createProfileForUser(params: {
    userId: number;
    profileName: string;
    profilePictureFile?: { buffer: Buffer; originalFilename: string } | null;
    profilePictureUrl?: string | null;
}) {
    const { userId, profileName, profilePictureFile, profilePictureUrl } = params;

    let finalPictureUrl: string | null = null;

    if (profilePictureFile) {
        const fileExtension = profilePictureFile.originalFilename.split(".").pop()?.toLowerCase();
        const isValidImage = ["jpg", "jpeg", "png", "webp"].includes(fileExtension || "");

        if (!isValidImage) {
            throw new ServiceError(400, {
                error: "Only image files are allowed (jpg, jpeg, png, webp)",
            });
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (profilePictureFile.buffer.length > maxSize) {
            throw new ServiceError(400, {
                error: "File size must be less than 5MB",
            });
        }

        finalPictureUrl = await saveProfilePicture(profilePictureFile, userId);
    } else if (profilePictureUrl) {
        finalPictureUrl = toStringOrNull(profilePictureUrl);
    }

    const profile = await createUserProfile({
        userId,
        profileName,
        profilePicture: finalPictureUrl,
    });

    return {
        profileId: profile.profileId,
        profileName: profile.profileName,
        profilePicture: profile.profilePicture,
    };
}

export async function listProfilesForUser(userId: number) {
    const profiles = await listProfilesByUserId(userId);
    return {
        profiles,
    };
}

// Update one profile (only if it belongs to this user)
export async function updateProfileForUser(params: {
  userId: number;
  profileId: number;
  profileName?: string | null;
  profilePictureFile?: { buffer: Buffer; originalFilename: string } | null;
  profilePictureUrl?: string | null;
}) {
  const { userId, profileId, profileName, profilePictureFile, profilePictureUrl } = params;

  // 1) find profile and check owner
  const existing = await findProfileByIdAndUserId(profileId, userId);
  if (!existing) {
    throw new ServiceError(404, { error: "Profile not found" });
  }

  // 2) build new picture URL (if provided)
  let finalPictureUrl: string | undefined = undefined; // undefined = "do not touch"

  if (profilePictureFile) {
    const fileExtension = profilePictureFile.originalFilename.split(".").pop()?.toLowerCase();
    const isValidImage = ["jpg", "jpeg", "png", "webp"].includes(fileExtension || "");

    if (!isValidImage) {
      throw new ServiceError(400, {
        error: "Only image files are allowed (jpg, jpeg, png, webp)",
      });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (profilePictureFile.buffer.length > maxSize) {
      throw new ServiceError(400, {
        error: "File size must be less than 5MB",
      });
    }

    finalPictureUrl = await saveProfilePicture(profilePictureFile, userId);
  } else if (typeof profilePictureUrl === "string") {
    finalPictureUrl = toStringOrNull(profilePictureUrl) ?? undefined;
  }

  // 3) build update data object
  const updateData: { profileName?: string; profilePicture?: string | null } = {};

  // only update name if provided
  if (typeof profileName === "string" && profileName.trim().length > 0) {
    updateData.profileName = profileName.trim();
  }

  // only update picture if we decided a new value
  if (finalPictureUrl !== undefined) {
    updateData.profilePicture = finalPictureUrl;
  }

  // if nothing to update → error
  if (Object.keys(updateData).length === 0) {
    throw new ServiceError(400, {
      error: "No valid fields to update",
    });
  }

  // 4) run update in DB
  const updated = await updateUserProfile(profileId, updateData);

  return {
    profileId: updated.profileId,
    profileName: updated.profileName,
    profilePicture: updated.profilePicture,
  };
}

// Delete one profile (only if it belongs to this user)
export async function deleteProfileForUser(params: {
    userId: number;
    profileId: number;
  }) {
    const { userId, profileId } = params;
  
    // 1) make sure profile exists and belongs to this user
    const existing = await findProfileByIdAndUserId(profileId, userId);
    if (!existing) {
      throw new ServiceError(404, { error: "Profile not found" });
    }
  
    // 2) delete picture file from disk
    await deleteProfilePictureFile(existing.profilePicture);
    
    // 3) delete in DB
    await deleteUserProfile(profileId);
  
    return {
      message: "Profile deleted",
    };
  }