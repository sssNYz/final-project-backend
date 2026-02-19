## Purpose

This file is the **standard** for this project.  
It is for **humans** and for **AI agents**.  
Please follow these rules when you add or change code.

## Tech stack

- **Next.js App Router** (one app for web UI + API routes)
- **TypeScript**
- **Prisma** + **MySQL**
- **Supabase Auth** (see `AUTHENTICATION.md`)

## About this project

- We have **two main clients**:
  - **Mobile app** → used by normal end users.
  - **Web app** → used by admins.
- Both clients talk to the **same Next.js backend**.
- API rules:
  - Paths that start with `/api/mobile/...` are for the **mobile app**.
  - Paths that start with `/api/admin/...` are for the **admin web app**.

## Architecture style (name)

We use a **Layered Architecture**:

1. **Controller** → API route file (`route.ts`)
2. **Service** → business logic (rules)
3. **Repository** → database access (Prisma)
4. **Database** → MySQL

Short name: **CSR Layered Architecture (Controller–Service–Repository)**.

## High level flow

- **Client** (web or mobile)
  - calls **API route** in `app/api/.../route.ts`  → **Controller**
  - calls **Service** in `server/{feature}/*.service.ts`
  - calls **Repository** in `server/{feature}/*.repository.ts`
  - uses **Prisma client** from `server/db/client.ts`
  - talks to **MySQL** (schema in `prisma/schema.prisma`)

API routes must stay **thin**.  
Most logic must live in **service** and **repository** files.

## Folder structure (target)

Project root:

```text
.
├─ app/
│  ├─ page.tsx
│  ├─ layout.tsx
│  ├─ globals.css
│  └─ api/                      # API controllers (Next.js route handlers)
│     ├─ mobile/                # APIs for mobile users
│     │  └─ v1/
│     │     ├─ users/
│     │     │  ├─ me/
│     │     │  │  └─ route.ts
│     │     │  └─ update/
│     │     │     └─ route.ts
│     │     └─ ...              # other mobile features
│     ├─ admin/                 # APIs for admin web
│     │  └─ v1/
│     │     ├─ users/
│     │     │  ├─ list/
│     │     │  │  └─ route.ts
│     │     │  └─ detail/
│     │     │     └─ route.ts
│     │     └─ ...              # other admin features
│
├─ server/                      # backend logic for all APIs
│  ├─ db/
│  │  └─ client.ts              # single PrismaClient instance
│  ├─ auth/
│  │  ├─ auth.service.ts        # auth business logic
│  │  └─ auth.repository.ts     # Prisma calls for auth/user account
│  ├─ users/
│  │  ├─ users.service.ts
│  │  └─ users.repository.ts
│  └─ ...                       # one folder per feature
│
├─ lib/                         # shared helpers (no Prisma here)
│  ├─ auth.ts
│  ├─ apiHelpers.ts
│  └─ supabaseClient.ts
│
├─ prisma/
│  ├─ schema.prisma             # database schema
│  ├─ migrations/               # auto-created by Prisma
│  └─ prisma.config.ts
│
├─ types/
│  └─ next-auth.d.ts
│
├─ .env                         # env vars (DATABASE_URL, SUPABASE_*)
├─ AGENT.md                     # this file
├─ AUTHENTICATION.md
├─ HOW_TO_GET_TOKEN_FOR_POSTMAN.md
├─ SETUP_CHECKLIST.md
├─ package.json
└─ README.md
```

> Note: `server/` exists already but may be empty.  
> New backend logic must be added there, not inside `app/api`.

## API controllers (app/api)

- **Location (new standard)**:
  - Mobile API: `app/api/mobile/v1/{feature}/{action}/route.ts`
  - Admin API:  `app/api/admin/v1/{feature}/{action}/route.ts`
- **Role**: **Controller**
- **What it can do**:
  - Read request (body, params, headers, auth)
  - Call **service** functions
  - Convert result to HTTP response (`NextResponse.json`)
  - Map errors to HTTP status codes
- **What it must NOT do**:
  - Create `new PrismaClient()`
  - Write raw Prisma queries
  - Contain big business logic blocks

Example pattern (mobile user update):

```ts
// app/api/mobile/v1/users/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateUserProfile } from "@/server/users/users.service";

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUser = await requireAuth(request);
    const body = await request.json();

    const result = await updateUserProfile(supabaseUser, body);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    // map known errors to status codes here
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: error.statusCode ?? 500 },
    );
  }
}
```

### Web (admin) vs mobile (user) API

In this project we have **two API groups**:

- **Mobile** API → for end users.
- **Admin** API → for admin users in the web dashboard.

We separate API paths like this:

- Mobile: `app/api/mobile/v1/{feature}/{action}/route.ts` → `/api/mobile/v1/...`
- Admin:  `app/api/admin/v1/{feature}/{action}/route.ts`  → `/api/admin/v1/...`

Controllers (route files) can be different for mobile and admin, but
**services and repositories are shared by feature**:

- `server/{feature}/{feature}.service.ts` → may have functions for mobile and for admin.
- `server/{feature}/{feature}.repository.ts` → Prisma DB access for both.

## Services (server/{feature}/*.service.ts)

- **Location**: `server/{feature}/{feature}.service.ts`
  - Example: `server/auth/auth.service.ts`
  - Example: `server/users/users.service.ts`
- **Role**: business logic
- **Can**:
  - Validate input (or call validator helpers)
  - Apply rules (permissions, allowed fields, etc.)
  - Call repository functions
  - Build plain JS objects to return to controller
- **Must NOT**:
  - Use `new PrismaClient()`
  - Import `@prisma/client` directly
  - Talk to HTTP request/response objects

Example pattern:

```ts
// server/users/users.service.ts
import { findUserBySupabaseOrEmail, updateUserAccount } from "./users.repository";

export async function updateUserProfile(supabaseUser: { id: string; email: string | null }, body: any) {
  const user = await findUserBySupabaseOrEmail(
    supabaseUser.id,
    (supabaseUser.email || "").toLowerCase().trim(),
  );

  if (!user) {
    const error: any = new Error("User not found in database");
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = ["tutorialDone"];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    const error: any = new Error("No valid fields to update");
    error.statusCode = 400;
    error.allowedFields = allowedFields;
    throw error;
  }

  const updatedUser = await updateUserAccount(user.userId, updateData);

  return {
    message: "User updated successfully",
    user: {
      userId: updatedUser.userId,
      email: updatedUser.email,
      supabaseUserId: updatedUser.supabaseUserId,
      provider: updatedUser.provider,
      role: updatedUser.role,
      tutorialDone: updatedUser.tutorialDone,
      lastLogin: updatedUser.lastLogin,
      createdAt: updatedUser.createdAt,
    },
  };
}
```

## Repositories (server/{feature}/*.repository.ts)

- **Location**: `server/{feature}/{feature}.repository.ts`
  - Example: `server/users/users.repository.ts`
  - Example: `server/auth/auth.repository.ts`
- **Role**: data access (Prisma)
- **Can**:
  - Import Prisma client from `server/db/client`
  - Run Prisma queries
- **Must NOT**:
  - Know about HTTP (no `NextRequest`, `NextResponse`)
  - Contain business rules

Example pattern:

```ts
// server/db/client.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

```ts
// server/users/users.repository.ts
import { prisma } from "@/server/db/client";

export async function findUserBySupabaseOrEmail(supabaseUserId: string, email: string) {
  return prisma.userAccount.findFirst({
    where: {
      OR: [
        { supabaseUserId },
        { email },
      ],
    },
    include: {
      profiles: {
        select: {
          profileId: true,
          profileName: true,
          profilePicture: true,
        },
      },
    },
  });
}

export async function updateUserAccount(userId: number, data: Record<string, unknown>) {
  return prisma.userAccount.update({
    where: { userId },
    data,
  });
}
```

## lib/ folder

- **Location**: `lib/`
- **Role**: shared helpers that are **not bound to one feature**
- Examples in this project:
  - `lib/auth.ts` (auth helpers, `requireAuth`, etc.)
  - `lib/apiHelpers.ts` (wrappers like `withRole`)
  - `lib/supabaseClient.ts`
- **Must NOT**:
  - Contain Prisma queries
  - Depend on `server/{feature}` (to avoid circular imports)

## Prisma rules

- All Prisma code must:
  - Use the single client from `server/db/client.ts`
  - Live inside `server/{feature}/*.repository.ts`
- You must **not** create a new `PrismaClient` in:
  - `app/api/**/route.ts`
  - `lib/**`
- Prisma schema stays in `prisma/schema.prisma`.

## Environment variables (short)

- **File**: `.env` in project root.
- **Required for DB**:
  - `DATABASE_URL` → MySQL connection string (used by Prisma).
- **Auth**:
  - Supabase keys and URLs (see `AUTHENTICATION.md`).

AI agents: if you add a new env var, please **document it** in `SETUP_CHECKLIST.md`.

## When you add a new API

1. **Pick a feature name** (example: `users`, `auth`, `medicine`).
2. **Create controller**:
   - Mobile: `app/api/mobile/v1/{feature}/{action}/route.ts`, or
   - Admin:  `app/api/admin/v1/{feature}/{action}/route.ts`.
3. If needed, **create service** in `server/{feature}/{feature}.service.ts`.
4. If you need DB, **create repository** in `server/{feature}/{feature}.repository.ts`.
5. Use Prisma only inside repository files.
6. Keep the controller thin: validate input, call service, map output to HTTP.

This pattern must be used for **all new APIs** in this project.


## API Docs (Swagger / OpenAPI)

- Live docs: `http://localhost:3000/api-doc`
- Spec file: `public/openapi.json`
- Rule: When you create or change any API in `app/api/**`, you must update the OpenAPI spec so docs are always correct for both clients (mobile and admin).

UI behavior
- Light theme only, examples and models are hidden for readability.
- Built‑in search is enabled; page also has quick filters for Mobile/Admin.
- Authorization persists once you paste a bearer token.

Categories (tags)
- Use these tags to keep docs easy to scan for each client:
  - `Admin - {Feature}` → for endpoints under `/api/admin/...`
  - `Mobile - {Feature}` → for endpoints under `/api/mobile/...`
- Examples: `Admin - Auth`, `Mobile - Auth`, `Mobile - Users`.

Protected endpoints
- If an endpoint requires a Supabase access token, add security: `"security": [{ "bearerAuth": [] }]`.
- The `bearerAuth` scheme is already defined in `components.securitySchemes`.

How to add a new endpoint to the spec
1. Open `public/openapi.json`.
2. Add or update an item under `paths` that matches your route path.
3. For each HTTP method you support (`get`, `post`, `patch`, etc.):
   - Set `tags` (choose from the list above) — exactly one per operation.
   - Add a concise `summary` and a clear `description`.
   - If the route is protected, include `security` with `bearerAuth`.
   - Define `requestBody` with `application/json` (or `multipart/form-data`) schema. Do not add `example(s)`.
   - Define `responses` for success and errors. Reuse shared schemas when possible (`ErrorResponse`, `PublicUserAccount`, etc.).
4. Save and visit `http://localhost:3000/api-doc` to verify.

Template (copy/paste and edit)
```json
"/api/mobile/v1/feature/action": {
  "post": {
    "tags": ["Mobile - Users"],
    "summary": "One‑line summary",
    "description": "Clear description of what this does.",
    "security": [{ "bearerAuth": [] }],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": { "type": "object", "properties": { "field": { "type": "string" } }, "required": ["field"] }
        }
      }
    },
    "responses": {
      "200": { "description": "OK", "content": { "application/json": { "schema": { "type": "object" } } } },
      "400": { "description": "Bad request", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } },
      "401": { "description": "Unauthorized", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } }
    }
  }
}
```

Notes
- Avoid `example(s)` in request/response bodies; the UI hides them to reduce noise.
- Use `Admin - {Feature}` for `/api/admin/...` endpoints and `Mobile - {Feature}` for `/api/mobile/...`.
- If you add new reusable models, prefer updating `components.schemas` and reference them with `$ref`.

## Data Model Notes

### MedicineList (User's Medicine Inventory)

The `MedicineList` model represents a user's personal medicine collection per profile.

Key design decision: **`mediId` is optional**.

- Users can create medicine list items **without** linking to the `MedicineDatabase`.
- This allows users to add custom/compounded medicines that don't exist in the database.
- Users can link the medicine later via the update endpoint.

Flow options:
1. **With database link**: User selects medicine from database → `mediId` is set
2. **Custom medicine**: User creates entry with just nickname/picture → `mediId` is null
3. **Link later**: User updates existing custom entry to link `mediId` when medicine becomes available

API behavior:
- `POST /api/mobile/v1/medicine-list/create` - `mediId` is optional
- `PATCH /api/mobile/v1/medicine-list/update` - Can set `mediId` to link, or `null` to unlink

### MedicineRegimen (Schedule Updates)

The `UserMedicineRegimen` update endpoint now supports updating schedule times.

Key design decision: **Times are replaced, not merged**.

- When `times` is provided in an update request, **all existing times are deleted** and the new times are created.
- This means `timeId`s will be regenerated (old IDs are deleted, new IDs are created).
- This is **safe** because `MedicationLog` records reference the `mediRegimenId`, not the individual `timeId`.

API behavior:
- `PATCH /api/mobile/v1/medicine-regimen/update`:
  - Can update schedule fields (scheduleType, startDate, endDate, etc.)
  - Can update `times` array (replaces all existing times)
  - `times` format is identical to the create endpoint
