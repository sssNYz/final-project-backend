import { User } from "@supabase/supabase-js";
import {
  createUserAccount,
  findUserByEmail,
  findUserBySupabaseOrEmail,
  findUserWithProfilesBySupabaseOrEmail,
  updateUserAccount,
} from "@/server/auth/auth.repository";
import { ServiceError } from "@/server/common/errors";
import {
  PublicUserAccount,
  PublicUserAccountWithProfiles,
  serializeUserAccount,
  serializeUserAccountWithProfiles,
} from "@/server/users/userAccount.serializer";

const ALLOWED_PROVIDERS = ["email", "google", "both"] as const;
export type AuthProvider = (typeof ALLOWED_PROVIDERS)[number];

function normalizeEmail(email?: string | null): string | null {
  return typeof email === "string" ? email.toLowerCase().trim() : null;
}

export async function checkEmailStatus(email: string): Promise<"existing" | "new"> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new ServiceError(
      400,
      { error: "Email is required and must be a string" },
      "Invalid email value"
    );
  }

  const existingUser = await findUserByEmail(normalizedEmail);
  return existingUser ? "existing" : "new";
}

export async function getAuthenticatedUserProfile(
  supabaseUser: User
): Promise<PublicUserAccountWithProfiles> {
  const normalizedEmail = normalizeEmail(supabaseUser.email);

  const user = await findUserWithProfilesBySupabaseOrEmail(
    supabaseUser.id,
    normalizedEmail
  );

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found in database",
      message: "Please call /api/mobile/v1/auth/sync-user to create your account",
    });
  }

  return serializeUserAccountWithProfiles(user);
}

export interface SyncUserInput {
  supabaseUser: User;
  supabaseUserId: string;
  email: string;
  provider: AuthProvider;
  allowMerge?: boolean;
}

export interface SyncUserResult {
  statusCode: number;
  message: string;
  user: PublicUserAccount;
}

export async function syncUserAccount({
  supabaseUser,
  supabaseUserId,
  email,
  provider,
  allowMerge,
}: SyncUserInput): Promise<SyncUserResult> {
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    throw new ServiceError(400, {
      error: "provider must be 'email', 'google', or 'both'",
    });
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedTokenEmail = normalizeEmail(supabaseUser.email);

  if (!normalizedEmail) {
    throw new ServiceError(400, { error: "Email is required" });
  }

  if (!supabaseUserId) {
    throw new ServiceError(400, { error: "supabaseUserId is required" });
  }

  if (!normalizedTokenEmail || normalizedTokenEmail !== normalizedEmail || supabaseUser.id !== supabaseUserId) {
    throw new ServiceError(403, {
      error: "Token does not match provided user data",
    });
  }

  const existingUser = await findUserBySupabaseOrEmail(
    supabaseUserId,
    normalizedEmail
  );

  if (!existingUser) {
    const createdUser = await createUserAccount({
      email: normalizedEmail,
      supabaseUserId,
      provider,
    });

    return {
      statusCode: 201,
      message: "User created successfully",
      user: serializeUserAccount(createdUser),
    };
  }

  const needsMerge = Boolean(
    existingUser.provider && existingUser.provider !== provider
  );

  if (needsMerge && allowMerge !== true) {
    throw new ServiceError(
      409,
      {
        error: "Account merge required but not allowed",
        message:
          "This email is already registered with a different login method. Please allow account merge to continue.",
      },
      "Account merge not allowed"
    );
  }

  const newProvider = needsMerge ? "both" : provider;
  const updatedUser = await updateUserAccount(existingUser.userId, {
    supabaseUserId,
    provider: newProvider,
    lastLogin: new Date(),
  });

  return {
    statusCode: 200,
    message: needsMerge
      ? "Accounts merged successfully"
      : "User updated successfully",
    user: serializeUserAccount(updatedUser),
  };
}


export async function syncAdminAccount(input: SyncUserInput): Promise<SyncUserResult> {
  // 1) first, do normal user sync (create or update + provider + lastLogin)
  const result = await syncUserAccount(input);

  // 2) decide the "bigger" role
  // roles in DB: "User" < "Admin" < "SuperAdmin"
  const currentRole = result.user.role;

  let targetRole = currentRole;

  // if user is only "User", upgrade to "Admin"
  if (currentRole === "User") {
    targetRole = "Admin";
  }

  // if already "Admin" or "SuperAdmin", keep it (this is already the bigger role)

  // 3) if role needs change, update it in DB
  if (targetRole !== currentRole) {
    const updatedUser = await updateUserAccount(result.user.userId, {
      role: targetRole,
    });

    return {
      statusCode: result.statusCode,
      message: "Admin synced successfully",
      user: serializeUserAccount(updatedUser),
    };
  }

  // role did not change
  return {
    ...result,
    message: "Admin synced successfully",
  };
}
