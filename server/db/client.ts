import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createMariaDbAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is missing. Prisma cannot connect to DB.");
  }

  const dbUrl = new URL(url);
  const database = dbUrl.pathname.replace(/^\//, "");

  const poolConfig: mariadb.PoolConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port ? Number(dbUrl.port) : 3306,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database,
    connectionLimit: 5,
  };

  return new PrismaMariaDb(poolConfig);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createMariaDbAdapter(),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
