import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
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
