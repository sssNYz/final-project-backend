# ✅ Setup Checklist for Supabase Authentication

## What Was Done

All the authentication system has been implemented! Here's what was created:

### 1. ✅ Database Changes
- Added `supabaseUserId` field to `UserAccount` model
- Added `provider` field to `UserAccount` model (stores "email", "google", or "both")
- Made `password` field optional (for OAuth users)

### 2. ✅ Helper Functions Created
- `lib/auth.ts` - Supabase token verification
- `lib/apiHelpers.ts` - Easy-to-use authentication wrappers

### 3. ✅ API Endpoints Created
- `POST /api/auth/check-email` - Check if email exists (for merge confirmation)
- `POST /api/auth/sync-user` - Sync user after Supabase login
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/users/update` - Update user profile

### 4. ✅ Example Routes (for learning)
- `app/api/example/protected-route/route.ts` - Basic auth example
- `app/api/example/admin-only/route.ts` - Role-based auth example

### 5. ✅ Documentation
- `AUTHENTICATION.md` - Complete guide with examples

---

## What You Need To Do Next

### Step 1: Set Up Environment Variables

Create a `.env` file in the project root with:

```env
# Database
DATABASE_URL="mysql://user:password@host:port/database"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

Get these values from your Supabase project dashboard.

### Step 2: Run Database Migration

```bash
npx prisma migrate dev --name add_supabase_auth_fields
```

This will:
- Create the migration file
- Update your database with new fields
- Regenerate Prisma client

**Or** if you're in production:

```bash
npx prisma migrate deploy
```

### Step 3: Test the API

Start your development server:

```bash
npm run dev
```

Test the endpoints with curl or Postman (see `AUTHENTICATION.md` for examples).

### Step 4: Configure Supabase

In your Supabase dashboard:

1. **Enable Email/Password auth**
   - Go to Authentication → Providers
   - Enable Email provider
   - Enable "Confirm email" if you want OTP

2. **Enable Google OAuth**
   - Go to Authentication → Providers
   - Enable Google provider
   - Add your OAuth credentials

3. **Set up email templates** (optional)
   - Go to Authentication → Email Templates
   - Customize OTP and welcome emails

### Step 5: Update Your Mobile App

Your mobile app should:

1. Use Supabase SDK for login/signup
2. Get the `access_token` after successful auth
3. Call `/api/auth/sync-user` after login
4. Include `Authorization: Bearer <token>` in all API requests

Example flows are in `AUTHENTICATION.md`.

### Step 6: Delete Example Files (When Ready)

Once you understand the authentication pattern, delete these example files:

```bash
rm -rf app/api/example
```

---

## Quick Test

After setup, test with this flow:

1. **Check email endpoint (no auth needed)**
   ```bash
   curl -X POST http://localhost:3000/api/auth/check-email \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Sync user (needs Supabase token)**
   - First, create a user in Supabase (through their dashboard or API)
   - Get the access token
   - Then:
   ```bash
   curl -X POST http://localhost:3000/api/auth/sync-user \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "supabaseUserId":"uuid-from-supabase",
       "email":"test@example.com",
       "provider":"email",
       "allowMerge":false
     }'
   ```

3. **Get current user**
   ```bash
   curl -X GET http://localhost:3000/api/auth/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Common Issues

### Issue: "Environment variable not found: DATABASE_URL"
**Solution:** Create a `.env` file with your database connection string.

### Issue: "Unauthorized - Invalid or missing token"
**Solution:** Make sure you're sending a valid Supabase access token in the Authorization header.

### Issue: "User not found in database"
**Solution:** Call `/api/auth/sync-user` first to create the user in your database.

### Issue: Migration fails
**Solution:** Make sure your database is running and `DATABASE_URL` is correct.

---

## Need Help?

- Read `AUTHENTICATION.md` for detailed examples
- Check example routes in `app/api/example/`
- Look at existing auth routes for patterns

---

## Summary

✅ All code is ready and working  
⏳ You need to: Set up `.env`, run migration, configure Supabase  
📱 Mobile app should: Use Supabase SDK and call your backend APIs  

That's it! Your authentication system is complete. 🎉






