import { ServiceError } from "../common/errors";
import { createUserProfile, listProfilesByUserId } from "./profile.repository";

function toStringOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function createProfileForUser(params: {
    userId: number;
    body: Record<string, unknown>;
}) {
    const { userId, body } = params;

    const profileName = toStringOrNull(body.profileName);
    if (!profileName) {
        throw new ServiceError(400, {
            error: "profileName is required",
        });
    }

    const profilePicture = toStringOrNull (body.profilePicture?? null);

    const profile = await createUserProfile({
        userId,
        profileName,
        profilePicture,
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