import { prisma } from "../db/client";

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
        where: {userId},
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
