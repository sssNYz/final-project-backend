# Medicine List API Guide

This guide shows how to update your app code to use the new `MedicineList` model.

## Database Structure (New)

```
UserProfile (profile)
    |
    +--> MedicineList (list of medicines with nicknames)
              |
              +--> UserMedicineRegimen (schedules)
                        |
                        +--> UserMedicineRegimenTime (times)
                        +--> MedicationLog (logs)

MedicineDatabase (master medicine data)
    |
    +--> MedicineList (user's copy with nickname)
```

## Flow: Old vs New

### OLD Flow (before):
1. User picks medicine from `MedicineDatabase`
2. User creates `UserMedicineRegimen` with `mediId`, `mediNickname`, `pictureOption`
3. Schedule is saved directly with medicine info

### NEW Flow (after):
1. User picks medicine from `MedicineDatabase`
2. Create `MedicineList` item first (with nickname, picture)
3. Create `UserMedicineRegimen` that points to `mediListId`
4. Schedule now links to the list item

## API Changes Needed

### 1. Create MedicineList API

New endpoints to add:

```
POST   /api/mobile/v1/medicine-list/create
GET    /api/mobile/v1/medicine-list/list
GET    /api/mobile/v1/medicine-list/:id
PUT    /api/mobile/v1/medicine-list/:id
DELETE /api/mobile/v1/medicine-list/:id
```

#### Example: Create Medicine List Item

```typescript
// POST /api/mobile/v1/medicine-list/create
// Request body:
{
  "profileId": 1,
  "mediId": 123,           // from MedicineDatabase
  "mediNickname": "White Circle",  // user's custom name
  "pictureOption": "pill_white"    // optional picture
}

// Response:
{
  "success": true,
  "data": {
    "mediListId": 456,
    "profileId": 1,
    "mediId": 123,
    "mediNickname": "White Circle",
    "pictureOption": "pill_white"
  }
}
```

#### Example: Get Medicine List

```typescript
// GET /api/mobile/v1/medicine-list/list?profileId=1
// Response:
{
  "success": true,
  "data": [
    {
      "mediListId": 456,
      "mediNickname": "White Circle",
      "pictureOption": "pill_white",
      "medicine": {
        "mediId": 123,
        "mediThName": "พาราเซตามอล",
        "mediEnName": "Paracetamol"
      }
    }
  ]
}
```

### 2. Update Regimen API

Change create regimen to use `mediListId` instead of `mediId` + `mediNickname` + `pictureOption`.

#### OLD way:
```typescript
// Create regimen (OLD)
const regimen = await prisma.userMedicineRegimen.create({
  data: {
    profileId: 1,
    mediId: 123,
    mediNickname: "White Circle",
    pictureOption: "pill_white",
    scheduleType: "DAILY",
    startDate: new Date(),
    // ...schedule fields
  }
});
```

#### NEW way:
```typescript
// Step 1: Create or find medicine list item first
const medicineList = await prisma.medicineList.create({
  data: {
    profileId: 1,
    mediId: 123,
    mediNickname: "White Circle",
    pictureOption: "pill_white"
  }
});

// Step 2: Create regimen with mediListId
const regimen = await prisma.userMedicineRegimen.create({
  data: {
    profileId: 1,
    mediListId: medicineList.mediListId,  // new field
    scheduleType: "DAILY",
    startDate: new Date(),
    // ...schedule fields
    
    // Keep old fields during migration (optional)
    mediId: 123,
    mediNickname: "White Circle",
    pictureOption: "pill_white"
  }
});
```

### 3. Query Changes

#### Get Regimen with Medicine Info (NEW):
```typescript
const regimen = await prisma.userMedicineRegimen.findUnique({
  where: { mediRegimenId: 1 },
  include: {
    medicineList: {
      include: {
        medicine: true  // get full medicine data
      }
    },
    times: true,
    logs: true
  }
});

// Access medicine nickname:
const nickname = regimen.medicineList?.mediNickname;

// Access medicine info:
const medicineName = regimen.medicineList?.medicine.mediEnName;
```

#### Get All Medicines for a Profile:
```typescript
const medicines = await prisma.medicineList.findMany({
  where: { profileId: 1 },
  include: {
    medicine: true,
    regimens: true  // get all schedules using this medicine
  }
});
```

## Backward Compatibility

During migration, keep both old and new fields working:

```typescript
// Helper function to get medicine nickname
function getMedicineNickname(regimen) {
  // Try new way first
  if (regimen.medicineList?.mediNickname) {
    return regimen.medicineList.mediNickname;
  }
  // Fall back to old field
  return regimen.mediNickname;
}

// Helper function to get medicine ID
function getMedicineId(regimen) {
  // Try new way first
  if (regimen.medicineList?.mediId) {
    return regimen.medicineList.mediId;
  }
  // Fall back to old field
  return regimen.mediId;
}
```

## Benefits of New Structure

1. **One nickname, many schedules**: Same medicine with same nickname can have many different schedules
2. **Easy to change nickname**: Update once in `MedicineList`, all regimens see the change
3. **User's medicine inventory**: `MedicineList` acts like user's personal medicine cabinet
4. **Clear data**: Medicine info is separate from schedule info

## Migration Checklist

- [ ] Run database migration SQL
- [ ] Add MedicineList API endpoints
- [ ] Update regimen create/update to use `mediListId`
- [ ] Update regimen queries to include `medicineList`
- [ ] Add backward compatibility helpers
- [ ] Test all flows work
- [ ] (Later) Remove old fields after full migration



