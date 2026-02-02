import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Build DATABASE_URL with connection pool limits
// connection_limit: Maximum number of connections in the pool
// pool_timeout: Time to wait (in seconds) before timing out when acquiring a connection
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || "";

  // Check if URL already has query parameters
  const separator = baseUrl.includes("?") ? "&" : "?";

  // Add connection pool limits if not already present
  if (!baseUrl.includes("connection_limit")) {
    return `${baseUrl}${separator}connection_limit=10&pool_timeout=20`;
  }

  return baseUrl;
}

// Use Prisma's normal MySQL connection (DATABASE_URL).
// The MariaDB driver adapter can timeout against MySQL 8.x auth/plugins.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
