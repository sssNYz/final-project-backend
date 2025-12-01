# Authentication System Guide

This backend uses **Supabase** for authentication and **Prisma** for storing user data.

## Overview

- **Supabase** handles: Login, OTP, Google OAuth, tokens, and password security
- **Our Backend** handles: User profile data, business logic, and database storage
- **Never store**: Passwords, OTPs, or Google tokens in our database

## How It Works

1. Mobile app signs up/logs in using Supabase
2. Supabase returns an `access_token` to the app
3. App sends requests to our backend with: `Authorization: Bearer <access_token>`
4. Backend verifies the token and processes the request

## API Endpoints

### 1. Check if Email Exists
**POST** `/api/auth/check-email`

Used before Google login to ask user about merging accounts.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "existing"  // or "new"
}
```

**No authentication required** for this endpoint.

---

### 2. Sync User to Database
**POST** `/api/auth/sync-user`

Creates or updates user in our database after Supabase authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "supabaseUserId": "xxxx-xxxx-xxxx",
  "email": "user@example.com",
  "provider": "email",  // "email", "google", or "both"
  "allowMerge": false   // true if user approves account merge
}
```

**Response (201 Created or 200 OK):**
```json
{
  "message": "User created successfully",
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "provider": "email",
    "supabaseUserId": "xxxx",
    "role": "User",
    "tutorialDone": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error (409 Conflict):**
```json
{
  "error": "Account merge required but not allowed",
  "message": "This email is already registered with a different login method..."
}
```

---

### 3. Get Current User Profile
**GET** `/api/auth/me`

Returns the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "supabaseUserId": "xxxx",
    "provider": "email",
    "role": "User",
    "tutorialDone": false,
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "profiles": []
  }
}
```

---

### 4. Update User Profile
**PATCH** or **POST** `/api/users/update`

Updates allowed user profile fields.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "tutorialDone": true
}
```

**Currently allowed fields:**
- `tutorialDone` (boolean)

**Response:**
```json
{
  "message": "User updated successfully",
  "user": { ... }
}
```

---

## Mobile App Flow Examples

### Email + Password Signup Flow

```
1. App → supabase.auth.signUp(email, password)
2. Supabase sends OTP to email
3. User enters OTP
4. App → supabase.auth.verifyOtp(otp)
5. App receives access_token
6. App → POST /api/auth/sync-user
   Body: { supabaseUserId, email, provider: "email", allowMerge: false }
7. Backend creates user in database
```

### Email + Password Login Flow

```
1. App → supabase.auth.signInWithPassword(email, password)
2. App receives access_token
3. App → POST /api/auth/sync-user (to update lastLogin)
4. App → GET /api/auth/me (to get user profile)
```

### Google Login Flow (with merge confirmation)

```
1. User enters email in app
2. App → POST /api/auth/check-email
   Body: { email }
3. Backend returns { status: "existing" } or { status: "new" }
4. If "existing", app shows confirmation dialog
5. If user agrees:
   - App → supabase.auth.signInWithOAuth({ provider: 'google' })
   - App receives access_token
   - App → POST /api/auth/sync-user
     Body: { supabaseUserId, email, provider: "google", allowMerge: true }
   - Backend updates provider to "both"
```

---

## For Developers: Adding Authentication to New Endpoints

### Method 1: Use `withAuth` Helper (Recommended)

This is the easiest way to add authentication:

```typescript
import { withAuth } from "@/lib/apiHelpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return withAuth(request, async (context) => {
    const { prismaUser, supabaseUser } = context;
    
    // Your endpoint logic here
    // prismaUser has: userId, email, role, etc.
    
    return NextResponse.json({ 
      data: "something",
      userId: prismaUser.userId 
    });
  });
}
```

### Method 2: Use `withRole` Helper (For Admin/Role-Based Endpoints)

```typescript
import { withRole } from "@/lib/apiHelpers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return withRole(request, "Admin", async (context) => {
    const { prismaUser } = context;
    
    // Only admins can access this endpoint
    
    return NextResponse.json({ success: true });
  });
}
```

### Method 3: Manual Auth (Full Control)

```typescript
import { requireAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // 1. Verify Supabase token
    const supabaseUser = await requireAuth(request);
    
    // 2. Find user in Prisma
    const user = await prisma.userAccount.findFirst({
      where: {
        OR: [
          { supabaseUserId: supabaseUser.id },
          { email: supabaseUser.email }
        ]
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // 3. Your logic here
    
    return NextResponse.json({ data: "something" });
    
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## Error Codes

- **400** Bad Request - Missing or invalid body parameters
- **401** Unauthorized - Invalid or missing token
- **403** Forbidden - User doesn't have permission (wrong role)
- **404** Not Found - User not found in database
- **409** Conflict - Account merge required but not allowed
- **500** Internal Server Error

---

## Database Schema Changes

The `UserAccount` model now has these new fields:

```prisma
model UserAccount {
  // Existing fields...
  supabaseUserId String?   @unique @map("SUPABASE_USER_ID")
  provider       String?   @map("PROVIDER")  // "email", "google", or "both"
  password       String?   @map("USER_PASSWORD")  // Now optional (null for OAuth)
  // Other fields...
}
```

**Don't forget to run the migration:**
```bash
npx prisma migrate deploy
```

---

## Testing

### Test with curl:

```bash
# Check email
curl -X POST http://localhost:3000/api/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Sync user (replace YOUR_TOKEN with real Supabase access token)
curl -X POST http://localhost:3000/api/auth/sync-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supabaseUserId":"xxxx",
    "email":"test@example.com",
    "provider":"email",
    "allowMerge":false
  }'

# Get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Security Notes

1. **Never store** passwords, OTPs, or OAuth tokens in our database
2. **Always verify** the Supabase token on every request
3. **Never trust** client data - always verify the token matches the request
4. **Use HTTPS** in production
5. **Set proper CORS** rules for your mobile app
6. **Rotate** Supabase keys if compromised

---

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
DATABASE_URL="mysql://..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

---

That's it! You now have a complete authentication system. 🎉






