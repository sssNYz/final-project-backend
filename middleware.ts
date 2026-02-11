import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============ Rate Limiting Configuration ============
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100; // Max 100 requests per minute per IP

// In-memory store for rate limiting (resets on server restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIP(request: NextRequest): string {
  // Try various headers for the real IP (behind proxy/load balancer)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  // Fallback to a generic identifier
  return "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // First request or window expired - create new record
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetTime: record.resetTime };
}

// ============ Request Logging ============
function logRequest(request: NextRequest, clientIP: string) {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = request.nextUrl.pathname + request.nextUrl.search;
  const origin = request.headers.get("origin") || "no-origin";
  const userAgent = request.headers.get("user-agent") || "no-user-agent";
  const auth = request.headers.get("authorization") ? "Bearer ***" : "no-auth";

  console.log(`\n========== INCOMING REQUEST ==========`);
  console.log(`[${timestamp}] ${method} ${url}`);
  console.log(`IP: ${clientIP} | Origin: ${origin}`);
  console.log(`Auth: ${auth}`);
  console.log(`User-Agent: ${userAgent}`);
  console.log(`=======================================\n`);
}

// ============ Middleware ============

export function middleware(request: NextRequest) {
  // Only handle API routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    const clientIP = getClientIP(request);

    // Log all incoming requests
    logRequest(request, clientIP);

    // Skip rate limiting for health check endpoints
    const isHealthCheck = request.nextUrl.pathname === "/api/health";

    // Apply rate limiting (skip for OPTIONS preflight requests)
    if (!isHealthCheck && request.method !== "OPTIONS") {
      const rateLimit = checkRateLimit(clientIP);

      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetTime / 1000)),
              "Retry-After": String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
              "Access-Control-Allow-Origin": origin || "*",
            },
          }
        );
      }
    }

    // Allow all origins in development (you can restrict this in production)
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://localhost:5173", // Vite default
      "http://localhost:5174",
      "http://localhost:8080",
      "http://localhost:8081",
    ];

    // Handle preflight requests (OPTIONS)
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // For actual requests, add CORS headers
    const response = NextResponse.next();

    if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development")) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    } else {
      response.headers.set("Access-Control-Allow-Origin", "*");
    }

    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Allow-Credentials", "true");

    // Add rate limit headers to successful responses
    if (!request.nextUrl.pathname.includes("/api/health")) {
      const record = rateLimitStore.get(clientIP);
      if (record) {
        response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS_PER_WINDOW));
        response.headers.set("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count)));
        response.headers.set("X-RateLimit-Reset", String(Math.ceil(record.resetTime / 1000)));
      }
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};


