import { Role, UserAccount } from "@prisma/client";

export interface PublicUserAccount {
  userId: number;
  email: string;
  supabaseUserId: string | null;
  provider: string | null;
  role: Role;
  tutorialDone: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}

export interface PublicUserAccountWithProfiles extends PublicUserAccount {
  profiles: Array<{
    profileId: number;
    profileName: string;
    profilePicture: string | null;
  }>;
}

function normalizeProviderForPublic(provider: string | null): string | null {
  if (provider === "both") return "email,google";
  return provider;
}

export function serializeUserAccount(user: UserAccount): PublicUserAccount {
  return {
    userId: user.userId,
    email: user.email,
    supabaseUserId: user.supabaseUserId,
    provider: normalizeProviderForPublic(user.provider),
    role: user.role,
    tutorialDone: user.tutorialDone,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
}

export function serializeUserAccountWithProfiles(
  user: UserAccount & {
    profiles: Array<{
      profileId: number;
      profileName: string;
      profilePicture: string | null;
    }>;
  }
): PublicUserAccountWithProfiles {
  return {
    ...serializeUserAccount(user),
    profiles: user.profiles.map((profile) => ({
      profileId: profile.profileId,
      profileName: profile.profileName,
      profilePicture: profile.profilePicture ?? null,
    })),
  };
}
