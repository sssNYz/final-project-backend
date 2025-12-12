# How to Get Supabase Access Token for Postman

There are **3 easy ways** to get a token for testing your API in Postman.

---

## Method 1: Use Supabase REST API in Postman (Recommended)

This is the easiest way - you can do everything in Postman!

### Step 1: Sign Up a Test User

**Request:**
- **Method:** `POST`
- **URL:** `https://YOUR_PROJECT.supabase.co/auth/v1/signup`
- **Headers:**
  ```
  apikey: YOUR_SUPABASE_ANON_KEY
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "email": "test@example.com",
    "password": "testpassword123"
  }
  ```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com"
  }
}
```

**Copy the `access_token`** - this is what you need!

---

### Step 2: Use the Token in Your API Requests

In Postman, for any request to your backend:

1. Go to **Authorization** tab
2. Select **Bearer Token** type
3. Paste the `access_token` you got from Step 1
4. Or manually add header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## Method 2: Sign In Existing User

If you already have a user, use sign-in instead:

**Request:**
- **Method:** `POST`
- **URL:** `https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password`
- **Headers:**
  ```
  apikey: YOUR_SUPABASE_ANON_KEY
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "email": "test@example.com",
    "password": "testpassword123"
  }
  ```

**Response:** Same as signup - you'll get `access_token`

---

## Method 3: Use Supabase Dashboard (For Quick Testing)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** or use an existing user
4. Click on a user to see details
5. You can **manually create a token** or use the user's ID

**Note:** This method is less convenient. Method 1 is better for Postman.

---

## Complete Postman Collection Example

Here's a complete flow you can set up in Postman:

### Request 1: Sign Up
```
POST https://YOUR_PROJECT.supabase.co/auth/v1/signup
Headers:
  apikey: YOUR_SUPABASE_ANON_KEY
  Content-Type: application/json
Body:
{
  "email": "test@example.com",
  "password": "testpassword123"
}
```

### Request 2: Sync User (Your Backend)
```
POST http://localhost:3000/api/auth/sync-user
Headers:
  Authorization: Bearer {{access_token}}
  Content-Type: application/json
Body:
{
  "supabaseUserId": "{{user_id}}",
  "email": "test@example.com",
  "provider": "email",
  "allowMerge": false
}
```

### Request 3: Get Current User (Your Backend)
```
GET http://localhost:3000/api/auth/me
Headers:
  Authorization: Bearer {{access_token}}
```

---

## Using Postman Variables (Pro Tip)

1. In Request 1 (Sign Up), add this to **Tests** tab:
   ```javascript
   var jsonData = pm.response.json();
   pm.environment.set("access_token", jsonData.access_token);
   pm.environment.set("user_id", jsonData.user.id);
   pm.environment.set("user_email", jsonData.user.email);
   ```

2. Then in your backend requests, use:
   ```
   Authorization: Bearer {{access_token}}
   ```

3. In request body:
   ```json
   {
     "supabaseUserId": "{{user_id}}",
     "email": "{{user_email}}",
     "provider": "email",
     "allowMerge": false
   }
   ```

This way, you only sign up once, and all other requests use the saved token!

---

## Quick Test Script

If you prefer using curl or a script, here's a quick way:

```bash
# Sign up and get token
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/signup' \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

Copy the `access_token` from the response and use it in Postman.

---

## Important Notes

1. **Token Expires:** Access tokens expire after 1 hour (3600 seconds)
   - If you get "Unauthorized", get a new token
   - Or use the `refresh_token` to get a new access token

2. **Refresh Token (Optional):**
   ```
   POST https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=refresh_token
   Headers:
     apikey: YOUR_SUPABASE_ANON_KEY
   Body:
   {
     "refresh_token": "your_refresh_token_here"
   }
   ```

3. **Replace These Values:**
   - `YOUR_PROJECT` → Your Supabase project URL (e.g., `abcdefghijklmnop`)
   - `YOUR_SUPABASE_ANON_KEY` → Found in Supabase Dashboard → Settings → API

---

## Example: Full Flow in Postman

### 1. Sign Up (Get Token)
```
POST https://abcdefghijklmnop.supabase.co/auth/v1/signup
Headers:
  apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzA5ODc2NDAwLCJzdWIiOiIxMjM0NTY3OC05MGFiLWNkZWYtMTIzNC01Njc4OTBhYmNkZWYiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20ifQ...",
  "user": {
    "id": "12345678-90ab-cdef-1234-567890abcdef",
    "email": "john@example.com"
  }
}
```

### 2. Sync User to Your Backend
```
POST http://localhost:3000/api/auth/sync-user
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzA5ODc2NDAwLCJzdWIiOiIxMjM0NTY3OC05MGFiLWNkZWYtMTIzNC01Njc4OTBhYmNkZWYiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20ifQ...
  Content-Type: application/json
Body:
{
  "supabaseUserId": "12345678-90ab-cdef-1234-567890abcdef",
  "email": "john@example.com",
  "provider": "email",
  "allowMerge": false
}
```

### 3. Get User Profile
```
GET http://localhost:3000/api/auth/me
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzA5ODc2NDAwLCJzdWIiOiIxMjM0NTY3OC05MGFiLWNkZWYtMTIzNC01Njc4OTBhYmNkZWYiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20ifQ...
```

---

## Troubleshooting

### Error: "Invalid API key"
- Make sure you're using the **anon key** (not the service role key)
- Check that the key is correct in Supabase Dashboard

### Error: "Email already registered"
- Use a different email, or
- Use the sign-in endpoint instead of sign-up

### Error: "Unauthorized" when calling your backend
- Token might be expired (get a new one)
- Make sure you're including `Bearer ` before the token
- Check that the token is from the correct Supabase project

### Token expires too quickly
- Use the refresh token to get a new access token
- Or just sign in again to get a fresh token

---

That's it! Now you can test all your API endpoints in Postman. 🎉






