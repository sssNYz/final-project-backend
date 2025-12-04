import "dotenv/config"

// Lightweight Prisma config compatible with the current
// Prisma 5.x dependency without importing "prisma/config".
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
}
