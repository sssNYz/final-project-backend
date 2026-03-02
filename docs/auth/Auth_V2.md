# Auth V2: Dual Strategy (Cookie + Bearer Token)

## 1. Overview
This system implements a **Dual Authentication Strategy** to support two different types of clients securely:
1. **Web Clients (Admin Panel)**: Use **HttpOnly Cookies** (Secure, XSS-proof).
2. **Mobile Clients (Flutter)**: Use **Bearer Tokens** (Standard mobile auth).

The backend automatically detects which method is being used and handles it appropriately.

---

## 2. The Problem & Solution

### The Problem
- **CORS & Cookies**: Browsers block cookies between `http://localhost:3000` (frontend) and `https://api.medi-buddy.xyz` (backend) unless specific headers are set (`Access-Control-Allow-Credentials: true`).
- **Security**: Storing tokens in `localStorage` on the web is vulnerable to XSS attacks.
- **Mobile Compatibility**: Mobile apps (Flutter) do not handle cookies easily and prefer standard Bearer tokens.

### The Solution
- **Unified Backend**: The server supports **BOTH** methods simultaneously.
- **Priority**:
  1. Check `Authorization: Bearer <token>` header (Mobile priority).
  2. If missing, check `accessToken` HttpOnly cookie (Web fallback).
- **CORS**: Configured to dynamically reflect the origin and allow credentials for allowed domains (`localhost`, `medi-buddy.xyz`).

---

## 3. Authentication Flows

### A. Web Client (Cookie Flow) - Best for Admin Panel
Used by Next.js / React apps running in the browser.

1. **Login**:
   - Client sends `POST /api/auth/v2/login` with email/password.
   - Server returns JSON **AND** sets `Set-Cookie` headers (`accessToken`, `refreshToken`).
   - Cookies are `HttpOnly; Secure; SameSite=None` (allows cross-site usage).
2. **Requests**:
   - Client sends requests with `credentials: 'include'`.
   - Browser automatically attaches cookies.
   - Server reads `accessToken` from cookie.
3. **Refresh**:
   - Client calls `POST /api/auth/v2/refresh`.
   - Server reads `refreshToken` from cookie.
   - Server sets new `accessToken` cookie.
4. **Logout**:
   - Client calls `POST /api/auth/v2/logout`.
   - Server clears all cookies.

### B. Mobile Client (Token Flow) - Best for Flutter
Used by mobile applications.

1. **Login**:
   - Client sends `POST /api/auth/v2/login`.
   - Server returns JSON `{ accessToken, refreshToken, user }`.
   - Client saves these tokens in secure storage (e.g., `flutter_secure_storage`).
2. **Requests**:
   - Client manually adds header: `Authorization: Bearer <accessToken>`.
   - Server reads token from header.
3. **Refresh**:
   - Client calls `POST /api/auth/v2/refresh` with body `{ refreshToken: "..." }`.
   - Server returns new `{ accessToken }` in JSON.
   - Client updates secure storage.
4. **Logout**:
   - Client calls `POST /api/auth/v2/logout` with body `{ refreshToken: "..." }`.
   - Server invalidates token in database.

---

## 4. Key Configuration Files

### `middleware.ts` (CORS)
Handles Preflight (OPTIONS) and CORS headers.
- **Allowed Origins**: `http://localhost:3000`, `https://www.medi-buddy.xyz`
- **Credentials**: Allowed (`true`) if origin matches.

### `lib/cookies.ts`
Helper to set/clear cookies.
- **Attributes**: `HttpOnly`, `Secure`, `SameSite=None`, `Path=/`.
- **Expiry**: 15 min (Access), 7 days (Refresh).

### `lib/auth.ts` & `lib/auth-v2.ts`
Middleware that protects routes.
- **Logic**:
  ```typescript
  const token = headerToken || cookieToken;
  if (!token) throw new Error("Unauthorized");
  ```

---

## 5. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | No token in Header AND no Cookie found. | Check if client sent `Authorization` header OR if browser sent cookies (check DevTools Network tab). |
| `CORS Error` (Red in console) | Origin not allowed or Credentials missing. | Ensure frontend uses `credentials: 'include'` and backend `middleware.ts` has the origin allowlisted. |
| `Set-Cookie` ignored | Browser blocked it. | Ensure backend uses `SameSite=None` and `Secure` (requires HTTPS). |
