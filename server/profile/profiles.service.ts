import { ServiceError } from "../common/errors";
import { createUserProfile, listProfilesByUserId, saveProfilePicture } from "./profile.repository";

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
