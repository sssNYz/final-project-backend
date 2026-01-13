# Medicine Regimen API Hardening

## What this fixes

The old API allowed invalid combinations like:

- `scheduleType = DAILY` but still sending `daysOfWeek` / `intervalDays` / `cycleOnDays` / `cycleBreakDays`
- Changing `scheduleType` without clearing old schedule fields, leaving the DB in a mixed state

## Rules (server-enforced)

### CREATE (`POST /api/mobile/v1/medicine-regimen/create`)

- `DAILY`
- requires: `endDate`
- forbidden: `daysOfWeek`, `intervalDays`, `cycleOnDays`, `cycleBreakDays` (server rejects non-null values)
- `WEEKLY`
- requires: `daysOfWeek` (comma-separated `0-6`)
- forbidden: `intervalDays`, `cycleOnDays`, `cycleBreakDays`
- `INTERVAL`
- requires: `intervalDays >= 1`
- forbidden: `daysOfWeek`, `cycleOnDays`, `cycleBreakDays`
- `CYCLE`
- requires: `cycleOnDays >= 1`, `cycleBreakDays >= 1`
- forbidden: `daysOfWeek`, `intervalDays`

General:

- `endDate` must be `>= startDate` (when present)
- `times[]` must have at least 1 item
- `mealRelation = NONE` ⇒ `mealOffsetMin` must be `null/omitted`
- `mealRelation != NONE` ⇒ `mealOffsetMin` required and `>= 0`

### UPDATE (`PATCH /api/mobile/v1/medicine-regimen/update`)

- Same schedule rules apply to the final scheduleType after update.
- Server normalizes stored schedule fields so the DB cannot contain mixed schedule settings.

## Files touched

- Request parsing (Zod):
- `server/medicineRegimen/medicineRegimen.schemas.ts`
- API routes:
- `app/api/mobile/v1/medicine-regimen/create/route.ts`
- `app/api/mobile/v1/medicine-regimen/update/route.ts`
- Service validation + normalization:
- `server/medicineRegimen/medicineRegimen.service.ts`
- OpenAPI spec:
- `public/openapi.json`
- Swagger UI:
- `app/api-doc/route.ts`
- `app/api/openapi/route.ts`