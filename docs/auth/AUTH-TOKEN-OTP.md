# Authentication, Token, and OTP Flow Documentation

## Overview

This document details the authentication strategies implemented in the backend, specifically focusing on the **Dual Authentication** system that supports both **Admin Web** (browser-based) and **Mobile App** (Flutter/Native) clients using a unified API.

The core design philosophy is **Security for Web** and **Flexibility for Mobile**, achieved by returning authentication tokens in two ways simultaneously:
1.  **JSON Body:** Used by Mobile Apps (e.g., Flutter) to manually store and send via headers.
2.  **HttpOnly Cookies:** Used by Web Browsers (e.g., Admin Panel) for automatic, secure storage.

---

## 1. Authentication Flows

### A. Admin Authentication (Web Browser)

**Goal:** Secure access for administrators via a web browser.
**Key Security Feature:** Uses `HttpOnly` Cookies to prevent Cross-Site Scripting (XSS) attacks. JavaScript running in the browser cannot access these cookies, protecting the tokens even if the frontend is compromised.

#### **Flow:**

1.  **Register:**
    *   **Endpoint:** `POST /api/auth/v2/register`
    *   **Payload:** `{ "email": "admin@example.com", "password": "securePass123" }`
    *   **Action:** Server validates input, hashes password, creates an *unverified* user record, and sends a 6-digit OTP to the email.
    *   **Response:** JSON `{ "message": "OTP sent" }`. *No tokens are issued yet.*

2.  **Verify OTP & Login (Or Password Login):**
    *   **Endpoint:** `POST /api/auth/v2/otp/verify` (or `/api/auth/v2/login`)
    *   **Payload:** `{ "email": "admin@example.com", "code": "123456" }`
    *   **Action:**
        *   Server verifies the OTP code.
        *   Server generates an **Access Token** (JWT) and a **Refresh Token**.
        *   Server sets these tokens as **HttpOnly Cookies** in the HTTP response headers.
    *   **Response:**
        *   **Body:** JSON containing user info and tokens.
        *   **Headers:** `Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=None`, `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=None`

3.  **Subsequent Requests:**
    *   **Mechanism:** The browser **automatically** attaches the `accessToken` cookie to every request made to the API domain. The frontend code does *not* need to manually handle tokens.
    *   **Server Check:** Middleware checks for the presence of the `accessToken` cookie.

### B. Mobile Authentication (Flutter/Native)

**Goal:** Secure access for mobile users.
**Key Distinction:** Mobile apps do not run in a browser environment and are not subject to the same XSS vulnerabilities. They prefer explicit token management (saving to Secure Storage).

#### **Flow:**

1.  **Register:**
    *   **Endpoint:** `POST /api/auth/v2/register`
    *   **Action:** Same as Admin. Triggers OTP email.

2.  **Verify OTP & Login:**
    *   **Endpoint:** `POST /api/auth/v2/otp/verify` (or `/api/auth/v2/login`)
    *   **Action:** Server verifies OTP/Password and generates tokens.
    *   **Response:**
        *   **Body:** JSON `{ "accessToken": "ey...", "refreshToken": "...", "user": { ... } }`
    *   **Client Action:** The Mobile App reads this **JSON body**, extracts the tokens, and saves them securely (e.g., `FlutterSecureStorage`). The `Set-Cookie` headers are ignored.

3.  **Subsequent Requests:**
    *   **Mechanism:** The Mobile App **manually** adds the `Authorization` header to every HTTP request.
    *   **Header Format:** `Authorization: Bearer <access_token>`
    *   **Server Check:** Middleware checks for the `Authorization` header if the cookie is missing.

---

## 2. Why Admin (Web) != Mobile?

You asked: *"I do not understand why admin is not same with mobile, it use http only and server need to change respone style..."*

The server actually **does not change strictly separate response styles**. It provides a **Unified Response** that satisfies both:
*   It sends **JSON Code** (for Mobile).
*   It sends **Cookies** (for Web).

### The "Why": Security Context

| Feature | Admin Web (Browser) | Mobile App (Native) |
| :--- | :--- | :--- |
| **Environment** | Public Internet Browser (Chrome, Safari, etc.) | Sandboxed Device App |
| **Major Risk** | **XSS (Cross-Site Scripting):** Malicious scripts injected into a page can steal data. | **Device Theft / Rooting:** Physical access to the device. |
| **Token Storage** | **HttpOnly Cookie:** Best practice. JavaScript *cannot* read it, so XSS attacks cannot steal the token. | **Secure Storage:** (Keychain/Keystore). Apps explicitly save data here. |
| **Ease of Use** | **Cookies:** Browser handles sending/receiving automatically. | **Headers:** easier for developers to control in code (`dio.options.headers`). |

**Conclusion:** We use HttpOnly cookies for Admin to provide the highest security standard for web-based access. We use JSON/Headers for Mobile because it is the standard, most compatible way for native apps to communicate.

---

## 3. Tokens, OTP, and Rules

### A. Access Token (JWT)
*   **Type:** Bearer Token (JSON Web Token)
*   **Lifespan:** **15 Minutes**
*   **Content:** Contains `userId`, `email`, and `role` (Admin/User).
*   **Purpose:** Short-lived credential for accessing API resources.

### B. Refresh Token
*   **Type:** Opaque String (Database-backed)
*   **Lifespan:** **7 Days**
*   **Purpose:** Used to obtain a new Access Token when the old one expires, without forcing the user to log in again.
*   **Security:** stored in the database. Can be **Revoked** (e.g., on Logout or remote wipe) to immediately block access.

### C. OTP (One-Time Password)
*   **Format:** 6-Digit Numeric Code (e.g., `123456`)
*   **Lifespan:** **5 Minutes**
*   **Rate Limit:** 1 Request per **60 Seconds** (Cooldown).
*   **Usage:**
    *   **Registration:** Verifies email ownership.
    *   **Login (Admin Creation):** First-time verification.
    *   **Password Reset:** Securely verifies identity.

### D. Rules & Constraints
1.  **Email Verification:** A user *cannot* receive tokens (login) until their email is verified via OTP.
2.  **Dual Token Check:** The server Middleware checks:
    1.  Is there an `Authorization: Bearer` header? (Mobile) -> Verify it.
    2.  If not, is there an `accessToken` Cookie? (Web) -> Verify it.
3.  **Logout:**
    *   **Mobile:** Client deletes token from storage. Request to `/logout` revokes Refresh Token in DB.
    *   **Web:** Request to `/logout` revokes Refresh Token AND Server sends `Set-Cookie` with `Max-Age=0` to delete the cookies.
