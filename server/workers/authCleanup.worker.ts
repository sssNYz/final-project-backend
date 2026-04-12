import "dotenv/config";
import { prisma } from "../db/client";
import cron from "node-cron";

const DEFAULT_CRON_EXPRESSION = "*/10 * * * *";
const DEFAULT_UNVERIFIED_USER_GRACE_HOURS = 24;
const DEFAULT_UNVERIFIED_USER_BATCH_SIZE = 500;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const CRON_EXPRESSION =
  process.env.AUTH_CLEANUP_CRON ?? DEFAULT_CRON_EXPRESSION;
const UNVERIFIED_USER_GRACE_HOURS = parsePositiveInt(
  process.env.AUTH_UNVERIFIED_USER_GRACE_HOURS,
  DEFAULT_UNVERIFIED_USER_GRACE_HOURS,
);
const UNVERIFIED_USER_BATCH_SIZE = parsePositiveInt(
  process.env.AUTH_UNVERIFIED_USER_BATCH_SIZE,
  DEFAULT_UNVERIFIED_USER_BATCH_SIZE,
);

async function cleanupExpiredTokens(now: Date) {
  const [verificationTokens, passwordResetTokens, refreshTokens] =
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: { expires: { lt: now } },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

  return {
    verificationTokens: verificationTokens.count,
    passwordResetTokens: passwordResetTokens.count,
    refreshTokens: refreshTokens.count,
  };
}

async function cleanupStaleUnverifiedUsers(now: Date) {
  const cutoff = new Date(
    now.getTime() - UNVERIFIED_USER_GRACE_HOURS * 60 * 60 * 1000,
  );

  const staleUsers = await prisma.userAccount.findMany({
    where: {
      emailVerifiedAt: null,
      createdAt: { lt: cutoff },
      profiles: { none: {} },
      requests: { none: {} },
      handledRequests: { none: {} },
      ownedRelationships: { none: {} },
      viewedRelationships: { none: {} },
    },
    select: { userId: true, email: true },
    take: UNVERIFIED_USER_BATCH_SIZE,
    orderBy: { createdAt: "asc" },
  });

  if (staleUsers.length === 0) {
    return { users: 0, verificationTokens: 0, refreshTokens: 0, passwordResetTokens: 0 };
  }

  const userIds = staleUsers.map((user) => user.userId);
  const emails = staleUsers.map((user) => user.email);

  const [verificationTokens, refreshTokens, passwordResetTokens, users] =
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: { identifier: { in: emails } },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: { in: userIds } },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: { in: userIds } },
      }),
      prisma.userAccount.deleteMany({
        where: { userId: { in: userIds } },
      }),
    ]);

  return {
    users: users.count,
    verificationTokens: verificationTokens.count,
    refreshTokens: refreshTokens.count,
    passwordResetTokens: passwordResetTokens.count,
  };
}

async function tick() {
  const now = new Date();
  const tokenCleanup = await cleanupExpiredTokens(now);
  const staleUserCleanup = await cleanupStaleUnverifiedUsers(now);

  console.log(
    `[auth-cleanup] completed verificationTokens=${tokenCleanup.verificationTokens} passwordResetTokens=${tokenCleanup.passwordResetTokens} refreshTokens=${tokenCleanup.refreshTokens} staleUsers=${staleUserCleanup.users} staleUserVerificationTokens=${staleUserCleanup.verificationTokens} staleUserRefreshTokens=${staleUserCleanup.refreshTokens} staleUserPasswordResetTokens=${staleUserCleanup.passwordResetTokens}`,
  );
}

let running = false;
async function safeTick() {
  if (running) return;
  running = true;
  try {
    await tick();
  } catch (error) {
    console.error("[auth-cleanup] tick failed", error);
  } finally {
    running = false;
  }
}

if (!cron.validate(CRON_EXPRESSION)) {
  throw new Error(
    `Invalid AUTH_CLEANUP_CRON expression: ${CRON_EXPRESSION}`,
  );
}

console.log(
  `[auth-cleanup] started cron=${CRON_EXPRESSION} unverifiedGraceHours=${UNVERIFIED_USER_GRACE_HOURS} batchSize=${UNVERIFIED_USER_BATCH_SIZE}`,
);

cron.schedule(CRON_EXPRESSION, safeTick);
void safeTick();

async function shutdown(signal: string) {
  console.log(`[auth-cleanup] shutting down (${signal})`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
