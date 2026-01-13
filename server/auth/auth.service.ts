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

const ALLOWED_INPUT_PROVIDERS = ["email", "google", "both", "email,google"] as const;
export type AuthProvider = (typeof ALLOWED_INPUT_PROVIDERS)[number];
type StoredAuthProvider = "email" | "google" | "email,google";

function normalizeEmail(email?: string | null): string | null {
  return typeof email === "string" ? email.toLowerCase().trim() : null;
}

function normalizeProviderInput(provider: AuthProvider): StoredAuthProvider {
  if (provider === "both" || provider === "email,google") return "email,google";
  return provider;
}

function normalizeProviderFromDb(provider: string | null | undefined, hasPassword: boolean): StoredAuthProvider | null {
  if (!provider) return hasPassword ? "email" : null;
  if (provider === "both" || provider === "email,google") return "email,google";
  if (provider === "email" || provider === "google") return provider;
  return null;
}

function mergeProviders(existing: StoredAuthProvider | null, incoming: StoredAuthProvider): StoredAuthProvider {
  if (!existing || existing === incoming) return incoming;
  return "email,google";
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
}: SyncUserInput): Promise<SyncUserResult> {
  if (!ALLOWED_INPUT_PROVIDERS.includes(provider)) {
    throw new ServiceError(400, {
      error: "provider must be 'email', 'google', or 'email,google' (legacy 'both' also accepted)",
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

  const incomingProvider = normalizeProviderInput(provider);

  if (!existingUser) {
    const createdUser = await createUserAccount({
      email: normalizedEmail,
      supabaseUserId,
      provider: incomingProvider,
    });

    return {
      statusCode: 201,
      message: "User created successfully",
      user: serializeUserAccount(createdUser),
    };
  }

  const existingProvider = normalizeProviderFromDb(existingUser.provider, Boolean(existingUser.password));
  const newProvider = mergeProviders(existingProvider, incomingProvider);
  const didMerge = existingProvider !== null && existingProvider !== newProvider;

  const updatedUser = await updateUserAccount(existingUser.userId, {
    supabaseUserId,
    provider: newProvider,
    lastLogin: new Date(),
  });

  return {
    statusCode: 200,
    message: didMerge ? "Accounts merged successfully" : "User updated successfully",
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
