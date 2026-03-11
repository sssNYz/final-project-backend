import {
  createUserAccount,
  findUserByEmail,
  findUserWithProfilesById,
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
  userId: number
): Promise<PublicUserAccountWithProfiles> {

  const user = await findUserWithProfilesById(userId);

  if (!user) {
    throw new ServiceError(404, {
      error: "User not found in database",
      message: "Please call /api/mobile/v1/auth/sync-user to create your account",
    });
  }

  return serializeUserAccountWithProfiles(user);
}


