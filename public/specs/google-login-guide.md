# Mobile Dev Guide: Google Login & Account Merging

This guide explains the two new flows for the mobile application: standard Google Login and the Account Merge flow (when a Google user tries to set an email/password later).

---

## 1. Google Login Flow

### Flow Overview
1.  The user clicks "Login with Google" on the mobile app.
2.  The mobile app uses the Google SDK to log the user in and retrieves an `idToken` from Google.
3.  The mobile app sends this `idToken` to our backend API.
4.  The backend verifies the token, creates or logs in the user, and returns standard Access and Refresh tokens.

### The API
*   **Endpoint:** `POST /api/auth/v2/google-login`
*   **Request Body (JSON):**
    ```json
    {
      "idToken": "eyJhbGciOiJSUzI1..." 
    }
    ```

### What it Returns
**Success (200 OK):**
Returns the exact same payload as a normal Email/Password login.
```json
{
  "accessToken": "eyJhb...",
  "refreshToken": "rnd...",
  "user": {
    "userId": 123,
    "email": "user@gmail.com",
    "role": "User",
    "tutorialDone": false
  }
}
```

---

## 2. Account Merge Flow (Adding Email/Password)

### What case triggers this?
This flow happens when a user *originally* created their account using Google Login, but later decides they want to log in using an Email and Password. They go to the "Register" screen and type in their Gmail address and a new password.

### Flow Overview
1.  The user enters their Google email and a new password on the mobile "Register" screen.
2.  The mobile app calls the standard register API (`/api/auth/v2/register`).
3.  **The Trigger:** The backend detects that this email belongs to a "Google-only" account. It stops the registration, sends a 6-digit OTP to their email, and returns a specific `409` error with `requiresMerge: true`.
4.  The mobile app sees `requiresMerge: true` and shows an OTP entry screen instead of an error message.
5.  The user enters the OTP from their email, along with the password they want to set.
6.  The mobile app calls the new `merge` API.
7.  The account is successfully merged, and tokens are returned.

### The APIs & Triggers

**Step 1: The Trigger (Normal Registration attempt)**
*   **Endpoint:** `POST /api/auth/v2/register`
*   **Request:** `{ "email": "user@gmail.com", "password": "MyNewPassword123" }`
*   **What it Returns (The Trigger):** `409 Conflict`
    ```json
    {
      "error": "EMAIL_EXISTS",
      "message": "This email is associated with a Google account. Please verify your email with the OTP sent to set a password.",
      "requiresMerge": true
    }
    ```
    *(Mobile Dev instruction: When you see `requiresMerge: true`, keep the password they typed in memory, and navigate them to the OTP Verification screen).*

**Step 2: The Merge (Completing the process)**
*   **Endpoint:** `POST /api/auth/v2/register/merge`
*   **Request Body (JSON):**
    ```json
    {
      "email": "user@gmail.com",
      "otp": "123456",
      "newPassword": "MyNewPassword123"
    }
    ```
*   **What it Returns:**
    **Success (200 OK):**
    ```json
    {
      "message": "Password set successfully. Account merged.",
      "accessToken": "eyJhb...",
      "refreshToken": "rnd...",
      "user": {
        "userId": 123,
        "email": "user@gmail.com",
        "role": "User",
        "tutorialDone": false
      }
    }
    ```
