# FCM (Firebase Cloud Messaging) Setup Guide

## Step 1: Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate new private key**
5. Download the JSON file

## Step 2: Extract Values from JSON

Open the downloaded JSON file. You need these 3 values:

- `project_id` → use as `FIREBASE_PROJECT_ID`
- `client_email` → use as `FIREBASE_CLIENT_EMAIL`
- `private_key` → use as `FIREBASE_PRIVATE_KEY` (keep the `\n` characters!)

## Step 3: Add Environment Variables

Add these to your `.env` file (or PM2 environment):

```env
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- Keep the `\n` in `FIREBASE_PRIVATE_KEY` (they are real newlines)
- Wrap the private key in double quotes `"`
- The private key should be one long string with `\n` inside

## Step 4: Test Firebase Admin Setup

After setting environment variables, restart your server, then test:

```bash
# Test endpoint
curl http://localhost:3000/api/test-fcm
```

Or open in browser: `http://localhost:3000/api/test-fcm`

**Expected Success Response:**
```json
{
  "success": true,
  "message": "✅ Firebase Admin is working correctly!",
  "details": {
    "success": true,
    "message": "Firebase Admin initialized successfully",
    "hasEnvVars": true,
    "hasCredentialsFile": false
  }
}
```

**If it fails**, check:
1. All 3 env vars are set correctly
2. `FIREBASE_PRIVATE_KEY` has `\n` (not actual newlines)
3. Server was restarted after adding env vars

## Step 5: For PM2 Production

If using PM2, add env vars to `ecosystem.config.cjs`:

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  FIREBASE_PROJECT_ID: 'your-project-id',
  FIREBASE_CLIENT_EMAIL: 'your-email@project.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
}
```

Then restart PM2:
```bash
npm run pm2:restart
```

## Files Created

- `server/notifications/fcm.ts` - Firebase Admin helper functions
- `app/api/test-fcm/route.ts` - Test endpoint to verify setup

## Next Steps

After Firebase Admin is working:
1. Add DeviceToken table to Prisma schema
2. Create API endpoint to save device tokens from mobile app
3. Worker will use `sendPushToToken()` function to send notifications
