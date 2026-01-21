`---
name: Drop regimen fields
overview: Remove `NEXT_OCCURRENCE_AT` and `CYCLE_ANCHOR_DATE` from the regimen table and Prisma model, and use `START_DATE` as the cycle anchor instead.
todos:
  - id: schema-remove-fields
    content: Remove `nextOccurrenceAt` and `cycleAnchorDate` from `UserMedicineRegimen` in `prisma/schema.prisma`
    status: in_progress
  - id: migration-drop-columns
    content: Create a new Prisma migration to drop `NEXT_OCCURRENCE_AT` and `CYCLE_ANCHOR_DATE` from MySQL
    status: in_progress
    dependencies:
      - schema-remove-fields
  - id: regen-client
    content: Regenerate Prisma client and ensure the project compiles
    status: pending
    dependencies:
      - migration-drop-columns
  - id: verify-usage
    content: Search and confirm there is no remaining code that reads/writes these fields
    status: pending
    dependencies:
      - regen-client
---

# Remove NEXT_OCCURRENCE_AT and CYCLE_ANCHOR_DATE

## What will change

- **Database**: drop 2 columns from `USER_MEDICINE_REGIMEN`.
- **Prisma model**: remove 2 fields from `UserMedicineRegimen`.
- **Logic**: for `ScheduleType.CYCLE`, we will treat `startDate` as the anchor date (no separate `cycleAnchorDate`). For “next occurrence”, we will not store `nextOccurrenceAt` in DB.

## Steps

- **Update Prisma schema** in [`/root/Project/final-project-backend/prisma/schema.prisma`](/root/Project/final-project-backend/prisma/schema.prisma)
- Remove `nextOccurrenceAt` and `cycleAnchorDate` from `model UserMedicineRegimen`.
- **Create a new Prisma migration** (since your DB already has these columns)
- Run `npx prisma migrate dev --name drop_next_occurrence_and_cycle_anchor`.
- Confirm the generated SQL drops:
    - `NEXT_OCCURRENCE_AT`
    - `CYCLE_ANCHOR_DATE`
- **Regenerate Prisma client**
- Run `npx prisma generate` (often migrate already does this, but we’ll ensure it).
- **Verify no code breaks**
- Search for any usage of `nextOccurrenceAt` / `cycleAnchorDate` (should be none).
- Run the app build/tests if you have them.

## Files involved

- [`/root/Project/final-project-backend/prisma/schema.prisma`](/root/Project/final-project-backend/prisma/schema.prisma)
- A new folder under [`/root/Project/final-project-backend/prisma/migrations/`](/root/Project/final-project-backend/prisma/migrations/) created by Prisma

## Implementation todos

- `schema-remove-fields`: Remove the 2 fields from `UserMedicineRegimen` in Prisma schema
- `migration-drop-columns`: Generate and check a new migration that drops the 2 DB columns