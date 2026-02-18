import jwt from "jsonwebtoken";
import crypto from "crypto";

// ============ Configuration ============
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days

if (!JWT_SECRET) {
    console.warn(
        "⚠️  JWT_SECRET is not set in environment variables. Auth V2 will not work."
    );
}

// ============ Access Token ============

export interface AccessTokenPayload {
    userId: number;
    email: string;
    role: string;
}

/**
 * Sign a short-lived Access Token (JWT)
 * Contains: userId, email, role
 */
export function signAccessToken(payload: AccessTokenPayload): string {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        algorithm: "HS256",
    });
}

/**
 * Verify and decode an Access Token
 * Returns the payload if valid, throws if invalid/expired
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");

    const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"],
    });

    return decoded as AccessTokenPayload;
}

// ============ Refresh Token ============

/**
 * Generate a cryptographically random Refresh Token (not a JWT)
 * This is a plain random string stored in the database
 */
export function generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
}

/**
 * Calculate the expiration date for a Refresh Token
 */
export function getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return expiry;
}

// ============ Helper ============

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.replace("Bearer ", "");
}
