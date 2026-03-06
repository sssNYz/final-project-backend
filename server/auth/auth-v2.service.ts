import { prisma } from "@/lib/prisma";
import { hashPassword, comparePassword } from "@/lib/password";
import {
  signAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from "@/lib/jwt";
import { sendOtpEmail } from "@/lib/email";
import { validateEmailWithAbstract } from "@/server/common/email-validation";
import { ServiceError } from "@/server/common/errors";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============ Register ============

interface RegisterInput {
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const { email, password } = input;

  // Check if user exists
  const existing = await prisma.userAccount.findUnique({
    where: { email },
  });

  if (existing) {
    // If they already have "email" as a provider
    if (existing.provider?.includes("email")) {
      if (existing.emailVerifiedAt) {
        throw new ServiceError(409, {
          error: "EMAIL_EXISTS",
          message: "This email is already registered and verified.",
        });
      }
    } else if (existing.provider === "google") {
      // Tell frontend this account requires merge, and let frontend ask the user
      // User will explicitly hit /otp/request if they say Yes
      throw new ServiceError(409, {
        error: "EMAIL_EXISTS",
        message:
          "This email is associated with a Google account. Would you like to set a password to also log in with email?",
        requiresMerge: true,
      } as any);
    }
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  if (!existing) {
    // Create unverified user
    await prisma.userAccount.create({
      data: {
        email,
        password: hashedPassword,
        provider: "email",
        status: true,
        // emailVerifiedAt is null by default
      },
    });
  } else {
    // Update password for unverified user
    await prisma.userAccount.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }

  // Trigger OTP
  await requestOtp(email);

  return {
    message:
      "Registration successful. Please verify your email with the OTP sent.",
  };
}

// ============ Admin Creation ============

// ============ Admin Creation ============

interface CreateAdminInput {
  email: string;
  password: string;
  creatorRole: string;
}

export async function createAdminUser(input: CreateAdminInput) {
  const { email, password, creatorRole } = input;

  // Both SuperAdmin and Admin can create new admins
  if (creatorRole !== "SuperAdmin" && creatorRole !== "Admin") {
    throw new ServiceError(403, {
      error: "FORBIDDEN",
      message: "Only Admins can create new admins.",
    });
  }

  // Verify with Abstract API
  const validationResult = await validateEmailWithAbstract(email);
  if (!validationResult.isValid) {
    throw new ServiceError(400, {
      error: "VALIDATION_ERROR",
      message: validationResult.message || "Invalid email address",
    });
  }

  // Check if user exists
  const existing = await prisma.userAccount.findUnique({
    where: { email },
  });

  if (existing) {
    throw new ServiceError(409, {
      error: "EMAIL_EXISTS",
      message: "This email is already registered.",
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create Admin user (Unverified)
  await prisma.userAccount.create({
    data: {
      email,
      password: hashedPassword,
      provider: "email",
      role: "Admin", // Explicitly set role to Admin
      status: true,
      // emailVerifiedAt: null, // Default behavior
      tutorialDone: false,
    },
  });

  // Trigger OTP for the new admin to verify
  await requestOtp(email);

  return {
    message:
      "Admin user created successfully. An OTP has been sent to their email for verification.",
  };
}

// ============ Google Login ============

export async function googleLoginUser(idToken: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new ServiceError(401, {
        error: "INVALID_TOKEN",
        message: "Invalid Google token payload",
      });
    }

    const email = payload.email;

    // Check if user exists
    let user = await prisma.userAccount.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        role: true,
        status: true,
        tutorialDone: true,
        provider: true,
      },
    });

    if (user) {
      // Check status
      if (!user.status) {
        throw new ServiceError(403, {
          error: "ACCOUNT_BANNED",
          message: "Your account has been suspended",
        });
      }

      // Merge provider if needed
      if (user.provider === "email") {
        user = await prisma.userAccount.update({
          where: { userId: user.userId },
          data: { provider: "email,google" },
          select: {
            userId: true,
            email: true,
            role: true,
            status: true,
            tutorialDone: true,
            provider: true,
          },
        });
      } else if (user.provider === null) {
        user = await prisma.userAccount.update({
          where: { userId: user.userId },
          data: { provider: "google" },
          select: {
            userId: true,
            email: true,
            role: true,
            status: true,
            tutorialDone: true,
            provider: true,
          },
        });
      }
    } else {
      // Create new Google user
      user = await prisma.userAccount.create({
        data: {
          email,
          provider: "google",
          status: true,
          emailVerifiedAt: new Date(), // Implicitly verified by Google
        },
        select: {
          userId: true,
          email: true,
          role: true,
          status: true,
          tutorialDone: true,
          provider: true,
        },
      });
    }

    // Generate tokens
    const accessToken = signAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.userId,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Update last login
    await prisma.userAccount.update({
      where: { userId: user.userId },
      data: { lastLogin: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        tutorialDone: user.tutorialDone,
      },
    };
  } catch (error) {
    console.error("Google verify token error:", error);
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(401, {
      error: "INVALID_TOKEN",
      message: "Failed to verify Google token",
    });
  }
}

// ============ Login ============

interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const { email, password } = input;

  // ... (rest of logic)
  // Find user
  const user = await prisma.userAccount.findUnique({
    where: { email },
    select: {
      userId: true,
      email: true,
      password: true,
      role: true,
      status: true,
      tutorialDone: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    throw new ServiceError(401, {
      error: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  }

  if (!user.status) {
    throw new ServiceError(403, {
      error: "ACCOUNT_BANNED",
      message: "Your account has been suspended. Please contact support.",
    });
  }

  if (!user.emailVerifiedAt) {
    // Allow legacy users (created before migration)? Or strict mode?
    // For now, strict mode for V2.
    // throw new ServiceError(403, { error: "EMAIL_NOT_VERIFIED", message: "Please verify your email address first." });

    // Actually, let's auto-request OTP if they aren't verified?
    // Or just tell them.
    throw new ServiceError(403, {
      error: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email address first.",
    });
  }

  if (!user.password) {
    throw new ServiceError(401, {
      error: "NO_PASSWORD",
      message:
        "This account does not have a password set. Please use your original login method.",
    });
  }

  // Verify password
  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new ServiceError(401, {
      error: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  }

  // Generate tokens
  const accessToken = signAccessToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  // Save refresh token to DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.userId,
      expiresAt: refreshTokenExpiry,
    },
  });

  // Update last login
  await prisma.userAccount.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.userId,
      email: user.email,
      role: user.role,
      tutorialDone: user.tutorialDone,
    },
  };
}

// ============ Refresh ============

export async function refreshAccessToken(refreshTokenValue: string) {
  // Find the token in DB
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenValue },
    include: {
      user: {
        select: {
          userId: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!tokenRecord) {
    throw new ServiceError(401, {
      error: "INVALID_REFRESH_TOKEN",
      message: "Invalid refresh token",
    });
  }

  if (tokenRecord.revoked) {
    throw new ServiceError(401, {
      error: "TOKEN_REVOKED",
      message: "This refresh token has been revoked",
    });
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new ServiceError(401, {
      error: "TOKEN_EXPIRED",
      message: "This refresh token has expired",
    });
  }

  if (!tokenRecord.user.status) {
    throw new ServiceError(403, {
      error: "ACCOUNT_INACTIVE",
      message: "Account is inactive or deleted",
    });
  }

  // Generate new access token
  const accessToken = signAccessToken({
    userId: tokenRecord.user.userId,
    email: tokenRecord.user.email,
    role: tokenRecord.user.role,
  });

  return {
    accessToken,
  };
}

// ============ Logout ============dsxccccc

export async function logoutUser(refreshTokenValue: string) {
  // Find and revoke the token
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenValue },
  });

  if (!tokenRecord) {
    // Silently succeed – token may already be gone
    return { message: "Logged out successfully" };
  }

  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true },
  });

  return { message: "Logged out successfully" };
}

// ============ Cleanup (optional utility) ============

/**
 * Remove expired & revoked refresh tokens from the database
 * Can be called by a cron job
 */
export async function cleanupExpiredTokens() {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
    },
  });

  return { deletedCount: result.count };
}

// ============ OTP Request ============

const OTP_EXPIRY_MINUTES = 5;
const OTP_COOLDOWN_SECONDS = 60;

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestOtp(email: string) {
  // Rate-limit: check if a recent OTP was sent
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      identifier: email,
      createdAt: { gt: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000) },
    },
  });

  if (recentToken) {
    throw new ServiceError(429, {
      error: "OTP_COOLDOWN",
      message: `Please wait before requesting a new code`,
    });
  }

  // Clean up old tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Generate & save OTP
  const code = generateOtpCode();
  const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: code,
      expires,
    },
  });

  // Send email
  await sendOtpEmail(email, code);

  return { message: "OTP sent successfully" };
}

// ============ OTP Verify ============

export async function verifyOtp(email: string, code: string) {
  // Find matching token
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: { identifier: email, token: code },
    },
  });

  if (!tokenRecord) {
    throw new ServiceError(400, {
      error: "INVALID_OTP",
      message: "Invalid verification code",
    });
  }

  if (tokenRecord.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
    throw new ServiceError(400, {
      error: "OTP_EXPIRED",
      message: "Verification code has expired",
    });
  }

  // OTP is valid — delete all tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Find or create user
  let user = await prisma.userAccount.findUnique({
    where: { email },
    select: {
      userId: true,
      email: true,
      role: true,
      status: true,
      tutorialDone: true,
      emailVerifiedAt: true,
    },
  });

  let isNewUser = false;

  if (!user) {
    // Auto-register
    user = await prisma.userAccount.create({
      data: {
        email,
        provider: "email",
      },
      select: {
        userId: true,
        email: true,
        role: true,
        status: true,
        tutorialDone: true,
        emailVerifiedAt: true,
      },
    });
    isNewUser = true;
  }

  // Verify user if not already
  if (!user.emailVerifiedAt) {
    await prisma.userAccount.update({
      where: { userId: user.userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  // Check account status
  if (!user.status) {
    throw new ServiceError(403, {
      error: "ACCOUNT_BANNED",
      message: "Your account has been suspended",
    });
  }

  // Generate tokens
  const accessToken = signAccessToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.userId,
      expiresAt: refreshTokenExpiry,
    },
  });

  // Update last login
  await prisma.userAccount.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    isNewUser,
    user: {
      userId: user.userId,
      email: user.email,
      role: user.role,
      tutorialDone: user.tutorialDone,
    },
  };
}

// ============ OTP Verify with Password (Merge) ============

export async function verifyOtpWithPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  // Find matching token
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: { identifier: email, token: code },
    },
  });

  if (!tokenRecord) {
    throw new ServiceError(400, {
      error: "INVALID_OTP",
      message: "Invalid verification code",
    });
  }

  if (tokenRecord.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
    throw new ServiceError(400, {
      error: "OTP_EXPIRED",
      message: "Verification code has expired",
    });
  }

  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Hash password
  const hashedPassword = await hashPassword(newPassword);

  // Update user
  const updatedUser = await prisma.userAccount.update({
    where: { email },
    data: {
      password: hashedPassword,
      provider: "email,google",
      emailVerifiedAt: new Date(),
    },
  });

  // Check account status
  if (!updatedUser.status) {
    throw new ServiceError(403, {
      error: "ACCOUNT_BANNED",
      message: "Your account has been suspended",
    });
  }

  // Generate tokens
  const accessToken = signAccessToken({
    userId: updatedUser.userId,
    email: updatedUser.email,
    role: updatedUser.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: updatedUser.userId,
      expiresAt: refreshTokenExpiry,
    },
  });

  // Update last login
  await prisma.userAccount.update({
    where: { userId: updatedUser.userId },
    data: { lastLogin: new Date() },
  });

  return {
    message: "Password set successfully. Account merged.",
    accessToken,
    refreshToken,
    user: {
      userId: updatedUser.userId,
      email: updatedUser.email,
      role: updatedUser.role,
      tutorialDone: updatedUser.tutorialDone,
    },
  };
}

// ============ Password Reset (Magic Link) ============

import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

const RESET_TOKEN_EXPIRY_MINUTES = 15;

/**
 * 1) Request Password Reset
 * Generates a secure token, saves it, and sends the email containing the magic link.
 */
export async function requestPasswordReset(email: string, redirectTo: string) {
  // 1. Check if user exists
  const user = await prisma.userAccount.findUnique({
    where: { email },
  });

  if (!user) {
    // Explicitly let the client know if the email was not found.
    return { error: "Email not found in our system." };
  }

  if (user.provider && !user.provider.includes("email")) {
    throw new ServiceError(403, {
      error: "INVALID_LOGIN_METHOD",
      message:
        "This account does not use a password. Please log in with your social provider.",
    });
  }

  // --- Security Check: Requesting Role vs Destination ---
  const isAdminPath =
    redirectTo.includes("admin.medi-buddy.xyz") || redirectTo.includes(":3001");

  // Both SuperAdmin and Admin are allowed to reset passwords on the Admin Panel
  if (isAdminPath && user.role === "User") {
    throw new ServiceError(403, {
      error: "FORBIDDEN",
      message: "This account does not have administrator privileges.",
    });
  }
  // ------------------------------------------------------

  // 2. Clear old reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.userId },
  });

  // 3. Generate a secure random token (e.g. 64 chars hex)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
  );

  // 4. Save to database
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.userId,
      expiresAt,
    },
  });

  // 5. Construct the magic link (pointing to our backend verify-redirect endpoint)
  const baseUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.medi-buddy.xyz";
  const escapeRedirect = encodeURIComponent(redirectTo);

  // It will look like: https://api.domain.com/api/auth/v2/forgot-password/verify-redirect?token=abc...&redirect_to=com.example.app...
  const magicLink = `${baseUrl}/api/auth/v2/forgot-password/verify-redirect?token=${token}&redirect_to=${escapeRedirect}`;

  // 6. Send the email
  await sendPasswordResetEmail(email, magicLink);

  return { message: "A password reset link has been sent to your email." };
}

/**
 * 2) Verify Password Reset Token (for Redirect)
 * Validates the token's existence and expiration.
 */
export async function verifyPasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    throw new ServiceError(400, {
      error: "INVALID_TOKEN",
      message: "This password reset link is invalid.",
    });
  }

  if (record.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    throw new ServiceError(400, {
      error: "TOKEN_EXPIRED",
      message:
        "This password reset link has expired. Please request a new one.",
    });
  }

  return record; // Token is valid
}

/**
 * 3) Reset Password
 * Validates the token, hashes the new password, updates the user, and revokes all active sessions.
 */
export async function resetPassword(token: string, newPassword: string) {
  // 1. Verify token
  const record = await verifyPasswordResetToken(token);

  // 2. Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // 3. Update the user's password
  await prisma.userAccount.update({
    where: { userId: record.userId },
    data: { password: hashedPassword },
  });

  // 4. Delete the used reset token
  await prisma.passwordResetToken.delete({ where: { id: record.id } });

  // 5. Security: Revoke all existing RefreshTokens and DeviceTokens for this user
  await prisma.refreshToken.updateMany({
    where: { userId: record.userId, revoked: false },
    data: { revoked: true },
  });

  // Also delete device tokens so mobile users are forcefully logged out
  await prisma.deviceToken.deleteMany({
    where: { userId: record.userId },
  });

  return {
    message:
      "Password has been successfully reset. Please log in with your new password.",
  };
}
