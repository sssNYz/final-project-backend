---
name: Medicine Regimen CRUD API
overview: Create mobile APIs to manage UserMedicineRegimen with support for multiple times (UserMedicineRegimenTime). Includes create, update, delete, and list endpoints following the CSR layered architecture pattern.
todos:
  - id: create-controllers
    content: Create 4 route handlers (create, list, update, delete) in app/api/mobile/v1/medicine-regimen/
    status: pending
  - id: create-service
    content: Create medicineRegimen.service.ts with validation for schedule types, times array, and mealOffsetMin rules
    status: pending
  - id: create-repository
    content: Create medicineRegimen.repository.ts with Prisma queries including transaction for create regimen + times
    status: pending
  - id: update-openapi
    content: Add all 4 endpoints to public/openapi.json under Mobile - MedicineRegimen tag
    status: pending
    dependencies:
      - create-controllers
---

# Medicine Regimen

CRUD API

## Goal

Create mobile APIs to manage `UserMedicineRegimen` rows with their related `UserMedicineRegimenTime` entries. Each regimen can have multiple times, and times must validate `mealOffsetMin` when `mealRelation != NONE`.

## Endpoints

- `POST /api/mobile/v1/medicine-regimen/create` - Create regimen with times

- `GET /api/mobile/v1/medicine-regimen/list?profileId=...` - List all regimens for a profile

- `PATCH /api/mobile/v1/medicine-regimen/update` - Update regimen fields (times unchanged)

- `DELETE /api/mobile/v1/medicine-regimen/delete` - Delete regimen (cascade deletes times)

## Data Structure

### Request Body (Create)

```json
{
  "mediListId": 123,
  "scheduleType": "DAILY",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T00:00:00Z",
  "daysOfWeek": "1,3,5",  // for WEEKLY (comma-separated, 0=Sunday, 1=Monday, etc.)
  "intervalDays": 2,      // for INTERVAL
  "cycleOnDays": 7,       // for CYCLE
  "cycleBreakDays": 3,    // for CYCLE
  "times": [
    {
      "time": "09:00",
      "dose": 1,
      "unit": "tablet",
      "mealRelation": "BEFORE_MEAL",
      "mealOffsetMin": 30
    },
    {
      "time": "21:00",
      "dose": 1,
      "unit": "tablet",
      "mealRelation": "NONE",
      "mealOffsetMin": null
    }
  ]
}
```



## Validation Rules

1. **Schedule Type Fields**:

- `WEEKLY` → `daysOfWeek` required (string like "1,3,5")

- `INTERVAL` → `intervalDays` required (number)

- `CYCLE` → `cycleOnDays` and `cycleBreakDays` required (numbers)

- `DAILY` → none of the above required

2. **Times Array**:

- At least 1 time required

- `time` format: "HH:MM" (e.g., "09:00", "14:30")

- `mealRelation != NONE` → `mealOffsetMin` required (number)

- `mealRelation == NONE` → `mealOffsetMin` must be null or not provided

3. **Ownership**:

- Check `mediListId` belongs to user's profile

- Check `profileId` belongs to authenticated user

## Implementation

### Files to Create

1. **Controllers** (`app/api/mobile/v1/medicine-regimen/`):

- `create/route.ts`

- `list/route.ts`
- `update/route.ts`

- `delete/route.ts`

2. **Service** (`server/medicineRegimen/`):

- `medicineRegimen.service.ts` - Business logic, validation

3. **Repository** (`server/medicineRegimen/`):

- `medicineRegimen.repository.ts` - Prisma queries

### Key Functions

**Service**:

- `createMedicineRegimen()` - Validate schedule fields, validate times, create regimen + times

- `listMedicineRegimens()` - List by profileId with times included

- `updateMedicineRegimen()` - Update regimen fields only (times unchanged)

- `deleteMedicineRegimen()` - Delete regimen (cascade deletes times)

**Repository**:

- `findRegimenById()` - Find regimen with times

- `findMedicineListByIdAndUserId()` - Verify ownership

- `createRegimenWithTimes()` - Transaction: create regimen + times

- `listRegimensByProfileId()` - Find all with times

- `updateRegimenFields()` - Update regimen only

- `deleteRegimenById()` - Delete regimen

### Time Storage

- Store `time` as `DateTime` in DB (convert "HH:MM" to full DateTime using `startDate` as base date)

- When reading, convert back to "HH:MM" format for response

## OpenAPI Update

Add endpoints to `public/openapi.json` under tag `Mobile - MedicineRegimen` with:

- Request/response schemas

- Validation rules in descriptions
- Security: `bearerAuth`

## Implementation todos

- `create-controllers`: Create 4 route handlers in `app/api/mobile/v1/medicine-regimen/`

- `create-service`: Create service file with validation and business logic

- `create-repository`: Create repository file with Prisma queries and transaction handling