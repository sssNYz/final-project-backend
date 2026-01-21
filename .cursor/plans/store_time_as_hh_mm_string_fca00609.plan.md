---
name: Store time as HH:MM string
overview: Change UserMedicineRegimenTime.time from DateTime to String "HH:MM", add UserAccount.timeZone, and update all code to work with time strings and timezone-aware DateTime building.
todos:
  - id: install-date-fns-tz
    content: Install date-fns-tz library for timezone conversion
    status: pending
  - id: schema-timeofday
    content: "Update Prisma schema: change time to timeOfDay String, add UserAccount.timeZone (default 'Asia/Bangkok')"
    status: pending
  - id: migration-add-fields
    content: "Create migration: add timeOfDay and timeZone fields (nullable first, set timeZone='Asia/Bangkok' for existing users)"
    status: pending
    dependencies:
      - schema-timeofday
  - id: migration-convert-data
    content: "Create data migration: convert existing DateTime times to HH:MM strings (extract hours:minutes from old time)"
    status: pending
    dependencies:
      - migration-add-fields
  - id: migration-make-required
    content: "Create migration: make timeOfDay NOT NULL, drop old time column (keep nextOccurrenceAt as-is, don't recalculate)"
    status: pending
    dependencies:
      - migration-convert-data
  - id: timezone-helper
    content: "Create timezone helper using date-fns-tz: buildDateTimeFromTimeOfDay() function"
    status: pending
    dependencies:
      - install-date-fns-tz
  - id: update-service
    content: Update medicineRegimen.service.ts to work with timeOfDay strings (remove DateTime building)
    status: pending
    dependencies:
      - timezone-helper
  - id: update-nextoccurrence
    content: Update nextOccurrence.ts to parse HH:MM and use timezone (read UserAccount.timeZone, default to 'Asia/Bangkok')"
    status: pending
    dependencies:
      - timezone-helper
  - id: update-repository
    content: Update medicineRegimen.repository.ts to save timeOfDay instead of time
    status: pending
    dependencies:
      - update-service
  - id: update-worker
    content: Update medicationCron.worker.ts to use timeOfDay strings (read timeOfDay, build DateTime with timezone)"
    status: pending
    dependencies:
      - update-nextoccurrence
---

# Plan: Store regimen time as "HH:MM" string

## Goal

Change `UserMedicineRegimenTime.time` from `DateTime` to `String "HH:MM"` to fix timezone issues. This makes times timezone-independent and easier to work with.

## Why this is better

- No timezone confusion: "15:00" is always "15:00" regardless of server timezone
- Works for multi-timezone users later
- Easier to edit/display in UI
- DB stays UTC (best practice)

## Schema changes

### 1) UserMedicineRegimenTime

- Change `time DateTime` → `timeOfDay String` (stores "HH:MM" like "15:00")
- Add validation: must match pattern `^([0-1][0-9]|2[0-3]):[0-5][0-9]$`

### 2) UserAccount

- Add `timeZone String?` (default `"Asia/Bangkok"` for existing users)
- Examples: `"Asia/Bangkok"`, `"America/New_York"`, etc.

### 3) MedicationLog (no change)

- Keep `scheduleTime DateTime` (UTC) - this is correct, it's a real moment

## Migration strategy

### Step 1: Add new fields (non-breaking)

- Add `timeOfDay String?` to `UserMedicineRegimenTime`
- Add `timeZone String?` to `UserAccount`
- Set default `timeZone = "Asia/Bangkok"` for all existing users

### Step 2: Convert existing data

- For each `UserMedicineRegimenTime`:
- Extract hours/minutes from old `time` DateTime
- Convert to "HH:MM" string, save to `timeOfDay`
- Note: old `time` was likely wrong (UTC), but we extract what we can

### Step 3: Make timeOfDay required, drop old time

- Make `timeOfDay` NOT NULL
- Drop `time` column

## Code changes

### Files to update

1. **`prisma/schema.prisma`**

- Change `UserMedicineRegimenTime.time` → `timeOfDay String`
- Add `UserAccount.timeZone String?`

2. **`server/medicineRegimen/medicineRegimen.service.ts`**

- Update `parseTimeString()` - already accepts "HH:MM", just remove DateTime conversion
- Update `formatTimeToHHMM()` - already returns "HH:MM", keep it
- Remove `parseTimeString()` DateTime building (no longer needed)
- Update `createMedicineRegimen()` - save `timeOfDay` string directly

3. **`server/medicineRegimen/nextOccurrence.ts`**

- Change `times: Array<{ time: Date }>` → `times: Array<{ timeOfDay: string }>`
- Update `calculateNextOccurrence()` to:
 - Parse "HH:MM" string
 - Build Date using user timezone (from `UserAccount.timeZone`)
 - Convert to UTC for comparisons

4. **`server/medicineRegimen/medicineRegimen.repository.ts`**

- Update `createRegimenWithTimes()` - save `timeOfDay` instead of `time`

5. **`server/workers/medicationCron.worker.ts`**

- Update to read `timeOfDay` string
- Build DateTime from string + user timezone when needed

6. **API routes** (if they return time)

- Already return "HH:MM" format, should work as-is

## Dependencies

- Install `date-fns-tz` package: `npm install date-fns-tz`

## Helper function needed

Create `server/common/timezone.ts`:

- `buildDateTimeFromTimeOfDay(timeOfDay: string, date: Date, timeZone: string): Date`
- Takes "15:00", a date, and timezone (e.g., "Asia/Bangkok")
- Uses `date-fns-tz` to build DateTime in that timezone
- Returns UTC DateTime for that moment
- Example: "15:00" + "2024-01-15" + "Asia/Bangkok" → UTC DateTime

## Important decisions

- **Library**: `date-fns-tz` (lightweight, easy to use)
- **Timezone default**: All existing users get `timeZone = "Asia/Bangkok"`, but field allows changing later
- **Migration**: Extract hours:minutes from old `time` DateTime (even if it was wrong UTC, we use what we can)
- **nextOccurrenceAt**: Keep existing values, don't recalculate (cron will fix them naturally over time)

## Testing checklist

- [ ] Create regimen with "15:00" → saves correctly
- [ ] Cron creates log at correct UTC time (15:00 Bangkok = 08:00 UTC)
- [ ] List regimens shows "15:00" correctly
- [ ] Update regimen time works
- [ ] Existing regimens converted correctly

## Rollback plan

If something breaks:

- Migration can be reversed (add `time` back, copy from `timeOfDay`)
- Code changes are isolated to regimen service