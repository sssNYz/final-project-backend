// server/follow/follow.service.ts
import { ServiceError } from "@/server/common/errors";
import * as repo from "./follow.repository";

// ---------- Helpers ----------

function validateImageFile(file: { buffer: Buffer; originalFilename: string }) {
    const fileExtension = file.originalFilename.split(".").pop()?.toLowerCase();
    const isValidImage = ["jpg", "jpeg", "png", "webp"].includes(fileExtension || "");

    if (!isValidImage) {
        throw new ServiceError(400, {
            error: "Only image files are allowed (jpg, jpeg, png, webp)",
        });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.buffer.length > maxSize) {
        throw new ServiceError(400, {
            error: "File size must be less than 5MB",
        });
    }
}
// ---------- User Search ----------

export async function searchUser(query: string) {
    if (!query || query.length < 3) {
        throw new ServiceError(400, { error: "Search query must be at least 3 characters long" });
    }

    const users = await repo.searchUsersByEmailPartial(query);
    return {
        users: users.map((u) => u.email),
    };
}

// ---------- Sender: Send Invite ----------

export async function sendInvite(params: {
    ownerUserId: number;
    email: string;
    profileIds?: number[] | null;
    name?: string;
    accountPicture?: string;
    accountPictureFile?: { buffer: Buffer; originalFilename: string } | null;
}) {
    const { ownerUserId, email, profileIds, name, accountPicture, accountPictureFile } = params;
    // Note: name/accountPicture from invite are stored as viewerNickname/viewerPicture

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

    // Validate picture file if present
    if (accountPictureFile) {
        validateImageFile(accountPictureFile);
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

    // 5. Create relationship (use string picture or default initially)
    let initialPicture = accountPicture || "/default-profile/GIU AMA 209-12.jpg";

    const relationship = await repo.createRelationship({
        ownerUserId,
        viewerUserId: targetUser.userId,
        isReceiverEmail: email.toLowerCase().trim(),
        profileIds: validProfileIds,
        viewerNickname: name || undefined,
        viewerPicture: initialPicture,
    });

    // 6. Save file if provided and update relationship
    if (accountPictureFile) {
        try {
            const newUrl = await repo.saveRelationshipPicture(accountPictureFile, relationship.relationshipId, name);
            await repo.updateRelationshipViewerPicture(relationship.relationshipId, newUrl);
            relationship.viewerPicture = newUrl;
        } catch (error) {
            console.error("Failed to save relationship picture:", error);
        }
    }

    return {
        message: "Invite sent successfully",
        relationship: {
            relationshipId: relationship.relationshipId,
            viewerEmail: email,
            profileIds: validProfileIds,
            status: relationship.status,
            viewerPicture: relationship.viewerPicture,
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
            viewerNickname: r.viewerNickname,
            viewerPicture: r.viewerPicture,
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
    profileIds?: number[];
    viewerNickname?: string;
    viewerPictureFile?: { buffer: Buffer; originalFilename: string } | null;
}) {
    const { ownerUserId, relationshipId, profileIds, viewerNickname, viewerPictureFile } = params;

    // 1. Check relationship exists and belongs to owner
    const relationship = await repo.findRelationshipByIdAndOwner(relationshipId, ownerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Relationship not found" });
    }

    // 2. Validate picture file if present
    if (viewerPictureFile) {
        validateImageFile(viewerPictureFile);
    }

    // 3. Validate profileIds belong to owner (if provided)
    let validProfileIds: number[] | undefined;
    if (profileIds && Array.isArray(profileIds)) {
        const ownerProfiles = await repo.findProfilesByOwner(ownerUserId);
        const ownerProfileIds = ownerProfiles.map((p) => p.profileId);
        validProfileIds = profileIds.filter((id) => ownerProfileIds.includes(id));
    }

    // 4. Save picture file if provided
    let newPictureUrl: string | undefined;
    if (viewerPictureFile) {
        try {
            newPictureUrl = await repo.saveRelationshipPicture(
                viewerPictureFile,
                relationshipId,
                viewerNickname || relationship.viewerNickname || undefined
            );
            // Delete old picture to free storage
            await repo.deleteOldPicture(relationship.viewerPicture);
        } catch (error) {
            console.error("Failed to save relationship picture:", error);
        }
    }

    // 5. Update relationship details
    const updateData: { viewerNickname?: string; viewerPicture?: string; profileIds?: number[] } = {};
    if (viewerNickname !== undefined) updateData.viewerNickname = viewerNickname;
    if (newPictureUrl) updateData.viewerPicture = newPictureUrl;
    if (validProfileIds !== undefined) updateData.profileIds = validProfileIds;

    const updated = await repo.updateRelationshipDetails(relationshipId, updateData);

    return {
        message: "Follower updated successfully",
        relationship: {
            relationshipId: updated.relationshipId,
            viewerNickname: updated.viewerNickname,
            viewerPicture: updated.viewerPicture,
            profileIds: validProfileIds ?? (updated.profileIds as number[]),
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
            viewerNickname: r.viewerNickname,
            viewerPicture: r.viewerPicture,
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
            viewerNickname: r.viewerNickname,
            viewerPicture: r.viewerPicture,
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
            viewerNickname: relationship.viewerNickname,
            viewerPicture: relationship.viewerPicture,
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

// ========== V2: Follower Functions ==========

// ---------- V2: Get Following List (shows ownerNickname/ownerPicture) ----------

export async function getFollowingV2(viewerUserId: number) {
    const relationships = await repo.findFollowingByViewer(viewerUserId);

    const allProfileIds = relationships.flatMap((r) => (r.profileIds as number[]) || []);
    const uniqueProfileIds = [...new Set(allProfileIds)];
    const profiles = await repo.findProfilesByIds(uniqueProfileIds);
    const profileMap = new Map(profiles.map((p) => [p.profileId, p]));

    const following = relationships.map((r) => {
        const sharedProfileIds = (r.profileIds as number[]) || [];
        return {
            relationshipId: r.relationshipId,
            ownerEmail: r.ownerUser.email,
            ownerNickname: r.ownerNickname,
            ownerPicture: r.ownerPicture,
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

// ---------- V2: Get Following Detail (shows ownerNickname/ownerPicture) ----------

export async function getFollowingDetailV2(params: {
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
            ownerNickname: relationship.ownerNickname,
            ownerPicture: relationship.ownerPicture,
        },
        profiles: profiles.map((p) => ({
            profileId: p.profileId,
            profileName: p.profileName,
            profilePicture: p.profilePicture,
        })),
    };
}

// ---------- V2: Update Following (viewer updates ownerNickname/ownerPicture) ----------

export async function updateFollowing(params: {
    viewerUserId: number;
    relationshipId: number;
    ownerNickname?: string;
    ownerPictureFile?: { buffer: Buffer; originalFilename: string } | null;
}) {
    const { viewerUserId, relationshipId, ownerNickname, ownerPictureFile } = params;

    // 1. Check relationship exists and belongs to viewer
    const relationship = await repo.findRelationshipByIdAndViewer(relationshipId, viewerUserId);
    if (!relationship) {
        throw new ServiceError(404, { error: "Relationship not found" });
    }

    if (relationship.status !== "APPROVED") {
        throw new ServiceError(403, { error: "Relationship is not approved" });
    }

    // 2. Validate picture file if present
    if (ownerPictureFile) {
        validateImageFile(ownerPictureFile);
    }

    // 3. Save picture file if provided
    let newPictureUrl: string | undefined;
    if (ownerPictureFile) {
        try {
            newPictureUrl = await repo.saveRelationshipPicture(
                ownerPictureFile,
                relationshipId,
                ownerNickname || relationship.ownerNickname || undefined
            );
            // Delete old picture to free storage
            await repo.deleteOldPicture(relationship.ownerPicture);
        } catch (error) {
            console.error("Failed to save owner picture:", error);
        }
    }

    // 4. Update relationship details
    const updateData: { ownerNickname?: string; ownerPicture?: string } = {};
    if (ownerNickname !== undefined) updateData.ownerNickname = ownerNickname;
    if (newPictureUrl) updateData.ownerPicture = newPictureUrl;

    const updated = await repo.updateFollowingDetails(relationshipId, updateData);

    return {
        message: "Following updated successfully",
        relationship: {
            relationshipId: updated.relationshipId,
            ownerNickname: updated.ownerNickname,
            ownerPicture: updated.ownerPicture,
            status: updated.status,
        },
    };
}

// ---------- V2: Get Following Medication Logs ----------

export async function getFollowingLogsV2(params: {
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

    // 4. Format response with full medicine details and note
    const formattedLogs = logs.map((log) => ({
        logId: log.logId,
        scheduleTime: log.scheduleTime,
        medicineName:
            log.medicineList.mediNickname ||
            log.medicineList.medicine?.mediThName ||
            log.medicineList.medicine?.mediEnName ||
            "Unknown",
        mediThName: log.medicineList.medicine?.mediThName || null,
        mediEnName: log.medicineList.medicine?.mediEnName || null,
        mediTradeName: log.medicineList.medicine?.mediTradeName || null,
        dose: log.dose,
        unit: log.unit,
        responseStatus: log.responseStatus,
        responseAt: log.responseAt,
        note: log.note,
    }));

    return { logs: formattedLogs };
}
