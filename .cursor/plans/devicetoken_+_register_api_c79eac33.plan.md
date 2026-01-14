---
name: DeviceToken + register API
overview: Add a DeviceToken table (many tokens per user) and a new authenticated API endpoint to save/update FCM tokens after login, so push notifications work reliably during development and production.
todos:
  - id: prisma-device-token
    content: Add DeviceToken model + relation in prisma/schema.prisma and create migration
    status: pending
  - id: api-device-token
    content: Add POST /api/mobile/v1/auth/device-token (auth + upsert by token + lastSeenAt)
    status: pending
    dependencies:
      - prisma-device-token
  - id: repo-device-token
    content: Add minimal repository/service helpers for upsert/find tokens
    status: pending
    dependencies:
      - prisma-device-token
---

# Plan: Save FCM token (many devices)

---

name: Medication cron + FCM

overview: Add a PM2 worker that runs every 5 minutes to create MedicationLog rows for due regimens, send FCM push using existing Firebase Admin helper, and update nextOccurrenceAt safely (no duplicates).

todos:

    - id: schema-medicationlog-queue

content: Add unique key and sent timestamps to MedicationLog in Prisma + migration

status: pending

    - id: refactor-nextoccurrence

content: Move/export next occurrence calculator so worker can reuse it

status: pending

dependencies:

            - schema-medicationlog-queue

    - id: worker-medication-cron

content: Implement PM2 worker (every 5 min): find due regimens, upsert MedicationLog, send push, update nextOccurrenceAt

status: pending

dependencies:

            - refactor-nextoccurrence

    - id: pm2-config

content: Add worker app entry to ecosystem.config.cjs

status: pending

dependencies:

            - worker-medication-cron

---

## Goal

Backend worker (PM2) that:

- Finds regimens that are due soon (use `nextOccurrenceAt`)

- Creates `MedicationLog` (this is the queue item)

- Sends FCM push (backend)

- Updates `UserMedicineRegimen.nextOccurrenceAt`

## Important: no same file edit

- You will edit `prisma/schema.prisma` to add `DeviceToken` + API.

- I will edit `prisma/schema.prisma` only for `MedicationLog`.

- We should not edit `prisma/schema.prisma` at the same time. We will do it one by one.

## Use existing FCM code

We already have:

- `server/notifications/fcm.ts` with `sendPushToToken()`

So we will NOT create `server/push/fcm.ts`.

## Prisma change (only MedicationLog)

Update `MedicationLog` in `prisma/schema.prisma`:

- Add `pushSentAt DateTime?`

- Add `supabaseSentAt DateTime?` (optional)

- Add unique key: `@@unique([profileId, mediRegimenId, scheduleTime])`

## Worker logic (every 5 min)

1) Select due regimens:

- `nextOccurrenceAt != null`

- `nextOccurrenceAt <= now + 5min`

- `endDate is null OR endDate >= now`

- include `times` and `medicineList.profile.userId`

2) Upsert queue item:

- Upsert `MedicationLog` by `(profileId, mediRegimenId, scheduleTime=nextOccurrenceAt)`

3) Push:

- Read all FCM tokens from your `DeviceToken` table by `userId`

- For each token call `sendPushToToken()` from `server/notifications/fcm.ts`

- If success: set `MedicationLog.pushSentAt = now`

4) Update nextOccurrenceAt:

- Reuse `calculateNextOccurrence` from `server/medicineRegimen/medicineRegimen.service.ts`

- Move it to a shared file (example `server/medicineRegimen/nextOccurrence.ts`) and export it

- Update `nextOccurrenceAt` using `now = oldNextOccurrenceAt` (so it always moves forward)

## Files to change/add

- `prisma/schema.prisma` (MedicationLog only)

- `prisma/migrations/...` (new migration for MedicationLog changes)

- `server/medicineRegimen/nextOccurrence.ts` (new shared helper)

- `server/workers/medicationCron.worker.ts` (new worker)

- `ecosystem.config.cjs` (add worker entry)

## Env vars (already supported by current FCM file)

From `server/notifications/fcm.ts`:

- `FIREBASE_PROJECT_ID`

- `FIREBASE_CLIENT_EMAIL`

- `FIREBASE_PRIVATE_KEY` (with \\n support)

or use `GOOGLE_APPLICATION_CREDENTIALS`

## Safety (no duplicate)

- DB unique key stops duplicate `MedicationLog`

- Worker only sends push when `pushSentAt is null`

## Goal

- Support **1 user = many device tokens** (phone, emulator, reinstall)
- Add a **new API** to save token after login (do not mix with `sync-user`)

## What we will build

- **DB**: new `DeviceToken` table linked to `UserAccount`
- **API**: `POST /api/mobile/v1/auth/device-token`
- Requires Supabase auth (`Authorization: Bearer ...`)
- Body: `token` (required), `platform` (optional), `deviceId` (optional)
- Behavior: **upsert by token** + set `userId` + update `lastSeenAt`

## Steps

### 1) Prisma schema + migration

- Update [`/root/Project/final-project-backend/prisma/schema.prisma`](/root/Project/final-project-backend/prisma/schema.prisma)
- Add model `DeviceToken`
- Add relation field on `UserAccount` (example: `deviceTokens DeviceToken[]`)
- Create migration under [`/root/Project/final-project-backend/prisma/migrations/`](/root/Project/final-project-backend/prisma/migrations/)

**Recommended fields**

- `token` (unique)
- `userId` (FK)
- `platform` (optional)
- `deviceId` (optional)
- `lastSeenAt` (set on every save)
- `revokedAt` (optional, for “delete token” logic later)

### 2) Repository/service helpers (small)

- Add DB functions to read/upsert tokens, using Prisma client
- Files likely:
- [`/root/Project/final-project-backend/server/users/users.repository.ts`](/root/Project/final-project-backend/server/users/users.repository.ts) (or a new `server/deviceTokens/...` module)

### 3) New API endpoint (register token)

- Create [`/root/Project/final-project-backend/app/api/mobile/v1/auth/device-token/route.ts`](/root/Project/final-project-backend/app/api/mobile/v1/auth/device-token/route.ts)
- `export const runtime = "nodejs";`
- Validate `token` is string
- Use `requireAuth()` to get Supabase user
- Find `UserAccount` by `supabaseUserId` (and fallback email)
- Upsert token row, set `lastSeenAt = now`

### 4) Client flow (Flutter)

- Keep using `POST /api/mobile/v1/auth/sync-user` after login
- After you get FCM token, call `POST /api/mobile/v1/auth/device-token`
- When token refresh happens, call the same endpoint again

### 5) Later (worker sending)

- Worker will read all tokens for a user and call `sendPushToToken()` from [`/root/Project/final-project-backend/server/notifications/fcm.ts`](/root/Project/final-project-backend/server/notifications/fcm.ts)
- If Firebase returns “token not valid”, we will **delete/revoke** that token

## Acceptance checks

- Migration applied, Prisma client works
- Calling `POST /api/mobile/v1/auth/device-token` saves token and updates `lastSeenAt`
- Same token sent again does not create duplicates (upsert works)