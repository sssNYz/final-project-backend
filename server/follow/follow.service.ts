// server/follow/follow.service.ts
import { ServiceError } from "@/server/common/errors";
import * as repo from "./follow.repository";

// ---------- Sender: Send Invite ----------

export async function sendInvite(params: {
    ownerUserId: number;
    email: string;
    profileIds?: number[] | null;
}) {
    const { ownerUserId, email, profileIds } = params;

    // 1. Check if email exists in database
    const targetUser = await repo.findUserByEmail(email);
    if (!targetUser) {
        throw new ServiceError(404, { error: "User with this email not found" });
    }

    // 2. Cannot invite yourself
    if (targetUser.userId === ownerUserId) {
        throw new ServiceError(400, { error: "You cannot invite yourself" });
    }

    // 3. Check if relationship already exists
    const existingRelationship = await repo.findExistingRelationship(ownerUserId, targetUser.userId);
    if (existingRelationship) {
        throw new ServiceError(409, {
            error: "Relationship already exists",
            status: existingRelationship.status,
        });
    }

    // 4. Validate profileIds belong to owner
    let validProfileIds: number[] = [];
    if (profileIds && profileIds.length > 0) {
        const ownerProfiles = await repo.findProfilesByOwner(ownerUserId);
        const ownerProfileIds = ownerProfiles.map((p) => p.profileId);
        validProfileIds = profileIds.filter((id) => ownerProfileIds.includes(id));

        if (validProfileIds.length === 0) {
            throw new ServiceError(400, { error: "No valid profiles provided" });
        }
    } else {
        // Share all profiles by default
        const ownerProfiles = await repo.findProfilesByOwner(ownerUserId);
        validProfileIds = ownerProfiles.map((p) => p.profileId);
    }

    // 5. Create relationship
    const relationship = await repo.createRelationship({
        ownerUserId,
        viewerUserId: targetUser.userId,
        isReceiverEmail: email.toLowerCase().trim(),
        profileIds: validProfileIds,
    });

    return {
        message: "Invite sent successfully",
        relationship: {
            relationshipId: relationship.relationshipId,
            viewerEmail: email,
            profileIds: validProfileIds,
            status: relationship.status,
        },
    };
}

// ---------- Sender: Get Followers ----------

export async function getFollowers(ownerUserId: number) {
    const relationships = await repo.findFollowersByOwner(ownerUserId);

    // Get all profile details for the shared profiles
    const allProfileIds = relationships.flatMap((r) => (r.profileIds as number[]) || []);
    const uniqueProfileIds = [...new Set(allProfileIds)];
    const profiles = await repo.findProfilesByIds(uniqueProfileIds);
    const profileMap = new Map(profiles.map((p) => [p.profileId, p]));

    const followers = relationships.map((r) => {
        const sharedProfileIds = (r.profileIds as number[]) || [];
        return {
            relationshipId: r.relationshipId,
            viewerEmail: r.viewerUser.email,
            sharedProfiles: sharedProfileIds.map((id) => {
                const profile = profileMap.get(id);
                return profile
                    ? { profileId: id, profileName: profile.profileName }
                    : { profileId: id, profileName: "Unknown" };
            }),
            status: r.status,
            createdAt: r.createdAt,
        };
    });

    return { followers };
}

// ---------- Sender: Update Follower Profiles ----------

export async function updateFollower(params: {
    ownerUserId: number;
    relationshipId: number;
    profileIds: number[];
}) {
    const { ownerUserId, relationshipId, profileIds } = params;

    // 1. Check relationship exists and belongs to owner
    const relationship = await repo.findRelationshipByIdAndOwner(relationshipId, ownerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Relationship not found" });
    }

    // 2. Validate profileIds belong to owner
    const ownerProfiles = await repo.findProfilesByOwner(ownerUserId);
    const ownerProfileIds = ownerProfiles.map((p) => p.profileId);
    const validProfileIds = profileIds.filter((id) => ownerProfileIds.includes(id));

    // 3. Update
    const updated = await repo.updateRelationshipProfiles(relationshipId, validProfileIds);

    return {
        message: "Follower profiles updated",
        relationship: {
            relationshipId: updated.relationshipId,
            profileIds: validProfileIds,
            status: updated.status,
        },
    };
}

// ---------- Sender: Remove Follower ----------

export async function removeFollower(params: {
    ownerUserId: number;
    relationshipId: number;
}) {
    const { ownerUserId, relationshipId } = params;

    const relationship = await repo.findRelationshipByIdAndOwner(relationshipId, ownerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Relationship not found" });
    }

    await repo.updateRelationshipStatus(relationshipId, "CANCELLED");

    return { message: "Follower removed successfully" };
}

// ---------- Follower: Get Pending Invites ----------

export async function getPendingInvites(viewerUserId: number) {
    const invites = await repo.findPendingInvitesByViewer(viewerUserId);

    // Get profile details
    const allProfileIds = invites.flatMap((r) => (r.profileIds as number[]) || []);
    const uniqueProfileIds = [...new Set(allProfileIds)];
    const profiles = await repo.findProfilesByIds(uniqueProfileIds);
    const profileMap = new Map(profiles.map((p) => [p.profileId, p]));

    const result = invites.map((r) => {
        const sharedProfileIds = (r.profileIds as number[]) || [];
        return {
            relationshipId: r.relationshipId,
            ownerEmail: r.ownerUser.email,
            sharedProfiles: sharedProfileIds.map((id) => {
                const profile = profileMap.get(id);
                return profile
                    ? { profileId: id, profileName: profile.profileName }
                    : { profileId: id, profileName: "Unknown" };
            }),
            createdAt: r.createdAt,
        };
    });

    return { invites: result };
}

// ---------- Follower: Accept Invite ----------

export async function acceptInvite(params: {
    viewerUserId: number;
    relationshipId: number;
}) {
    const { viewerUserId, relationshipId } = params;

    const relationship = await repo.findRelationshipByIdAndViewer(relationshipId, viewerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Invite not found" });
    }

    if (relationship.status !== "PENDING") {
        throw new ServiceError(400, { error: `Invite is already ${relationship.status}` });
    }

    await repo.updateRelationshipStatus(relationshipId, "APPROVED");

    return { message: "Invite accepted successfully" };
}

// ---------- Follower: Reject Invite ----------

export async function rejectInvite(params: {
    viewerUserId: number;
    relationshipId: number;
}) {
    const { viewerUserId, relationshipId } = params;

    const relationship = await repo.findRelationshipByIdAndViewer(relationshipId, viewerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Invite not found" });
    }

    if (relationship.status !== "PENDING") {
        throw new ServiceError(400, { error: `Invite is already ${relationship.status}` });
    }

    await repo.updateRelationshipStatus(relationshipId, "REJECTED");

    return { message: "Invite rejected" };
}

// ---------- Follower: Get Following List ----------

export async function getFollowing(viewerUserId: number) {
    const relationships = await repo.findFollowingByViewer(viewerUserId);

    // Get profile details
    const allProfileIds = relationships.flatMap((r) => (r.profileIds as number[]) || []);
    const uniqueProfileIds = [...new Set(allProfileIds)];
    const profiles = await repo.findProfilesByIds(uniqueProfileIds);
    const profileMap = new Map(profiles.map((p) => [p.profileId, p]));

    const following = relationships.map((r) => {
        const sharedProfileIds = (r.profileIds as number[]) || [];
        return {
            relationshipId: r.relationshipId,
            ownerEmail: r.ownerUser.email,
            sharedProfiles: sharedProfileIds.map((id) => {
                const profile = profileMap.get(id);
                return profile
                    ? { profileId: id, profileName: profile.profileName }
                    : { profileId: id, profileName: "Unknown" };
            }),
            status: r.status,
            createdAt: r.createdAt,
        };
    });

    return { following };
}

// ---------- Follower: Get Following Detail ----------

export async function getFollowingDetail(params: {
    viewerUserId: number;
    relationshipId: number;
}) {
    const { viewerUserId, relationshipId } = params;

    const relationship = await repo.findRelationshipByIdAndViewer(relationshipId, viewerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Relationship not found" });
    }

    if (relationship.status !== "APPROVED") {
        throw new ServiceError(403, { error: "Relationship is not approved" });
    }

    const sharedProfileIds = (relationship.profileIds as number[]) || [];
    const profiles = await repo.findProfilesByIds(sharedProfileIds);

    return {
        relationship: {
            relationshipId: relationship.relationshipId,
            ownerEmail: relationship.ownerUser.email,
        },
        profiles: profiles.map((p) => ({
            profileId: p.profileId,
            profileName: p.profileName,
            profilePicture: p.profilePicture,
        })),
    };
}

// ---------- Follower: Get Medication Logs ----------

export async function getFollowingLogs(params: {
    viewerUserId: number;
    relationshipId: number;
    profileId: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}) {
    const { viewerUserId, relationshipId, profileId } = params;

    // 1. Verify relationship
    const relationship = await repo.findRelationshipByIdAndViewer(relationshipId, viewerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Relationship not found" });
    }

    if (relationship.status !== "APPROVED") {
        throw new ServiceError(403, { error: "Relationship is not approved" });
    }

    // 2. Check if profileId is in shared profiles
    const sharedProfileIds = (relationship.profileIds as number[]) || [];
    if (!sharedProfileIds.includes(profileId)) {
        throw new ServiceError(403, { error: "This profile is not shared with you" });
    }

    // 3. Get logs
    const logs = await repo.findMedicationLogsByProfileId(profileId, {
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        endDate: params.endDate ? new Date(params.endDate) : undefined,
        limit: params.limit,
        offset: params.offset,
    });

    // 4. Format response
    const formattedLogs = logs.map((log) => ({
        logId: log.logId,
        scheduleTime: log.scheduleTime,
        medicineName:
            log.medicineList.mediNickname ||
            log.medicineList.medicine?.mediThName ||
            log.medicineList.medicine?.mediEnName ||
            "Unknown",
        dose: log.dose,
        unit: log.unit,
        responseStatus: log.responseStatus,
        responseAt: log.responseAt,
    }));

    return { logs: formattedLogs };
}

// ---------- Follower: Unfollow ----------

export async function unfollow(params: {
    viewerUserId: number;
    relationshipId: number;
}) {
    const { viewerUserId, relationshipId } = params;

    const relationship = await repo.findRelationshipByIdAndViewer(relationshipId, viewerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Relationship not found" });
    }

    await repo.updateRelationshipStatus(relationshipId, "CANCELLED");

    return { message: "Unfollowed successfully" };
}
