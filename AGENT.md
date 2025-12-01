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


