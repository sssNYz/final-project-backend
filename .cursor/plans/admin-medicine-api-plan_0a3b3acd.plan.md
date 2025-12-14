---
name: admin-medicine-api-plan
overview: Design and later implement an admin CRUD API for the medicine database, using the existing Prisma model, tracking the last editor admin from the local UserAccount table, and storing images in `public/uploads/medicine_database`, with separate controller files per action.
todos:
  - id: wire-admin-auth
    content: Wire medicine APIs to existing auth to get admin UserAccount and enforce admin role from local DB.
    status: pending
  - id: build-medicine-repository
    content: Create medicine.repository.ts with find, create, update, soft delete functions using MedicineDatabase model.
    status: pending
  - id: build-medicine-service
    content: Create medicine.service.ts implementing create/list/update/delete logic and editor id tracking.
    status: pending
  - id: add-admin-controllers
    content: Add admin route controllers under app/api/admin/v1/medicine for create, list, update, delete using CSR pattern.
    status: pending
  - id: handle-file-uploads
    content: Implement picture upload to public/uploads/medicine_database and saving relative path in mediPicture.
    status: pending
  - id: update-openapi-docs
    content: Update public/openapi.json to document new admin medicine endpoints.
    status: pending
---

# Admin Medicine API Plan

### 1. Use existing Prisma model (no schema change now)

- **Keep `MedicineDatabase` as-is**: use fields `mediThName`, `mediEnName`, `mediTradeName`, `mediType`, `mediUse`, `mediGuide`, `mediEffects`, `mediNoUse`, `mediWarning`, `mediStore`, `mediPicture`, `createdAt`, `updatedAt`, `deletedAt`, `adminId`.
- **`adminId` meaning**: store the **last admin userId who changed this medicine** (create, edit, delete). We will not keep full history table for now.
- **Soft delete**: when deleting, only set `deletedAt` and maybe a status flag in service; do **not** remove the row.
- **Picture field**: `mediPicture` will store the **relative path or file name** under `public/uploads/medicine_database` (for example `"uploads/medicine_database/1234.jpg"`).

### 2. Folder and file structure for medicine feature (multi-file controllers)

- We will use **many small route files** (your choice), one per action, and keep the existing plan style.
- **Controller (admin API routes)** under `app/api/admin/v1/medicine/`:
- `app/api/admin/v1/medicine/list/route.ts` → `GET`: list medicines ("see all").
- `app/api/admin/v1/medicine/create/route.ts` → `POST`: create medicine with image upload.
- `app/api/admin/v1/medicine/update/route.ts` → `PATCH`: update medicine, optional new image.
- `app/api/admin/v1/medicine/delete/route.ts` → `DELETE`: soft delete medicine by id.
- **Service** in `server/medicine/medicine.service.ts`:
- Functions like `createMedicine`, `listMedicines`, `updateMedicine`, `softDeleteMedicine`, handling rules and validation.
- **Repository** in `server/medicine/medicine.repository.ts`:
- Low-level Prisma calls to `MedicineDatabase` (create, findMany, update, etc.) and any filters (e.g. exclude `deletedAt` items).

### 3. Auth and role rules for admin endpoints (Supabase only for auth, local DB for roles)

- **Supabase use**: only for **authentication / tokens** via `requireAuth`; it does **not** store roles.
- **Roles in local DB**: use the `UserAccount` table in your own database to read `role` (`Admin`, `SuperAdmin`, `User`) and `userId`.
- **Require login**: use existing `requireAuth` helper from `lib/auth.ts` (same style as other APIs) to get the Supabase user.
- **Map Supabase user to `UserAccount`**: reuse or add a helper in `users` repository/service to find the admin `userId` by `supabaseUserId` or email.
- **Check role**: only allow `Role.Admin` or `Role.SuperAdmin` to call these medicine APIs; return 403 if normal `User`.
- **Store editor id**: in each service function, pass the admin `userId` to repository so it can set `adminId` when creating or updating or soft deleting.

### 4. Request/response design for each endpoint

- **Create medicine (POST `/api/admin/v1/medicine/create`)**:
- Request: `multipart/form-data` with text fields (`mediThName`, `mediEnName`, `mediTradeName`, `mediType`, `mediUse`, `mediGuide`, `mediEffects`, `mediNoUse`, `mediWarning`, `mediStore`) and one optional file field `picture`.
- Service: validate required fields (e.g. `mediThName`, `mediEnName`, `mediType`), save file to `public/uploads/medicine_database`, generate unique file name, pass relative path to repository.
- Response: JSON object with message and created medicine summary (id, names, type, picture URL, timestamps).
- **List medicines (GET `/api/admin/v1/medicine/list`)**:
- Request: query params for optional filters: `search` (text match in Thai or English name), `type` (ORAL/TOPICAL), `page`, `pageSize`.
- Repository: `findMany` on `MedicineDatabase` with `deletedAt: null` and search conditions; order by `createdAt` or name; support pagination.
- Response: JSON with `items` (array of medicines) and `meta` (page, total, pageSize).
- **Update medicine (PATCH `/api/admin/v1/medicine/update`)**:
- Request: `multipart/form-data` or JSON; include `mediId` and any fields to change; optional new `picture` file.
- Service: load current record, apply only allowed fields, upload new picture if present, optionally delete old picture file, update `adminId` to current admin, keep `deletedAt` if already set.
- Response: JSON with message and updated medicine.
- **Delete medicine (DELETE `/api/admin/v1/medicine/delete`)**:
- Request: JSON or query param with `mediId`.
- Service: set `deletedAt` to now, set `adminId` to current admin; optionally also remove picture file from disk or keep it (we can start by keeping it simple and not deleting the file).
- Response: JSON with success message; list endpoint will now hide this medicine.

### 5. File upload handling

- **Upload folder**: use `public/uploads/medicine_database` (create it if missing) so images are served at `/uploads/medicine_database/...`.
- **In controller**: use `request.formData()` in App Router to read `multipart/form-data` for create and update endpoints.
- **File naming**: generate safe unique names (for example: `${mediId or timestamp}_${originalName}` or a UUID) and save them with Node’s `fs` module.
- **Security**: limit allowed mime types (e.g. `image/jpeg`, `image/png`) and file size; reject or return 400 on invalid file.

### 6. OpenAPI spec update

- **Edit `public/openapi.json`**:
- Add entries for each new path under `/api/admin/v1/medicine/...` with tag `"Admin"`.
- For `create` and `update`, mark requestBody as `multipart/form-data` with fields and file.
- Add example responses for list, create, update, delete.
- **Check docs** at `/api-doc` to make sure the new endpoints appear correctly.

### 7. Future improvements (optional later)

- **History table**: later we can add a `MedicineDatabaseHistory` model to store full audit logs (who created, all edits, deletions) without changing the main behaviour.
- **Detail endpoint**: add `/api/admin/v1/medicine/detail` to fetch one medicine by id, reusing the same repository.
- **Shared DTO types**: create shared TypeScript types for medicine payloads in a `types` or `server/medicine` folder for reuse by controllers and services.