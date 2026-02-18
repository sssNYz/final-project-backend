import { prisma } from "@/lib/prisma";
import { hashPassword, comparePassword } from "@/lib/password";
import {
    signAccessToken,
    generateRefreshToken,
    getRefreshTokenExpiry,
} from "@/lib/jwt";
import { sendOtpEmail } from "@/lib/email";
import { ServiceError } from "@/server/common/errors";

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
        // If already verified, error
        if (existing.emailVerifiedAt) {
            throw new ServiceError(409, { error: "EMAIL_EXISTS", message: "This email is already registered and verified." });
        }
        // If unverified, we allows overwriting/resending (implicitly handle by requestOtp later)
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

    return { message: "Registration successful. Please verify your email with the OTP sent." };
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
            deletedAt: true,
        },
    });

    if (!user) {
        throw new ServiceError(401, { error: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    }

    if (user.deletedAt) {
        throw new ServiceError(401, { error: "ACCOUNT_DELETED", message: "This account has been deleted" });
    }

    if (!user.status) {
        throw new ServiceError(403, { error: "ACCOUNT_BANNED", message: "Your account has been suspended. Please contact support." });
    }

    if (!user.emailVerifiedAt) {
        // Allow legacy users (created before migration)? Or strict mode?
        // For now, strict mode for V2.
        // throw new ServiceError(403, { error: "EMAIL_NOT_VERIFIED", message: "Please verify your email address first." });

        // Actually, let's auto-request OTP if they aren't verified?
        // Or just tell them.
        throw new ServiceError(403, { error: "EMAIL_NOT_VERIFIED", message: "Please verify your email address first." });
    }

    if (!user.password) {
        throw new ServiceError(401, { error: "NO_PASSWORD", message: "This account does not have a password set. Please use your original login method." });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
        throw new ServiceError(401, { error: "INVALID_CREDENTIALS", message: "Invalid email or password" });
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
                    deletedAt: true,
                },
            },
        },
    });

    if (!tokenRecord) {
        throw new ServiceError(401, { error: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token" });
    }

    if (tokenRecord.revoked) {
        throw new ServiceError(401, { error: "TOKEN_REVOKED", message: "This refresh token has been revoked" });
    }

    if (tokenRecord.expiresAt < new Date()) {
        throw new ServiceError(401, { error: "TOKEN_EXPIRED", message: "This refresh token has expired" });
    }

    if (tokenRecord.user.deletedAt || !tokenRecord.user.status) {
        throw new ServiceError(403, { error: "ACCOUNT_INACTIVE", message: "Account is inactive or deleted" });
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

// ============ Logout ============

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
            OR: [
                { expiresAt: { lt: new Date() } },
                { revoked: true },
            ],
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
            deletedAt: true,
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
                deletedAt: true,
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
    if (user.deletedAt) {
        throw new ServiceError(401, {
            error: "ACCOUNT_DELETED",
            message: "This account has been deleted",
        });
    }

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
