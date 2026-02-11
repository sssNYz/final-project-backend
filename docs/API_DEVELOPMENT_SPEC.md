# API Development & Documentation Specification

This document outlines the standard workflow for creating new API endpoints and documenting them in the system. Our architecture uses a **Single Source of Truth** (`openapi.json`) that is automatically split into client-specific views (Mobile v1, Mobile v2, Admin v1).

---

## 1. Directory Structure

- **Implementation**: `app/api/[client]/[version]/[feature]/[action]/route.ts`
  - Example: `app/api/mobile/v2/follow/list-following/route.ts`
- **Documentation Source**: `public/openapi.json` (The Master File)
- **Documentation Views**: `public/specs/*.json` (Auto-generated read-only files)
- **Split Script**: `scripts/split-openapi.cjs`

---

## 2. Step-by-Step Workflow

To add a new API feature (e.g., "List User Favorites"), follow these steps:

### Step 1: Implement the Logic
Create the route handler in the Next.js App Router structure.
```typescript
// app/api/mobile/v2/favorites/list/route.ts
export async function GET(req: Request) { ... }
```

### Step 2: Document in `public/openapi.json`
Add your path to the `paths` object. You **MUST** follow these naming conventions for the splitter script to work:

1.  **Path Prefix**: Must start with one of:
    - `/api/mobile/v1/...`
    - `/api/mobile/v2/...`
    - `/api/admin/v1/...`

2.  **Tags**: Must be prefixed with `Mobile - ` or `Admin - `.
    - Example: `"tags": ["Mobile - Favorites"]`
    - *Note: You do not need to add this tag to the root `tags` array manually; the splitter script will auto-detect it.*

3.  **Operation ID**: Unique string (e.g., `listUserFavorites`).

**Example Entry:**
```json
"/api/mobile/v2/favorites/list": {
  "get": {
    "tags": ["Mobile - Favorites"],
    "summary": "List user favorites",
    "description": "Returns a list of favorite items for the authenticated user.",
    "operationId": "listUserFavorites",
    "responses": { ... }
  }
}
```

### Step 3: Update the Documentation Views
After saving `public/openapi.json`, run the splitter script to update the specific view files (`mobile-v1.json`, `mobile-v2.json`, etc.) that the UI uses.

```bash
node scripts/split-openapi.cjs
```
> **Output should look like:**
> ✅ admin-v1.json  →  14 paths...
> ✅ mobile-v1.json  →  37 paths...
> ✅ mobile-v2.json  →  6 paths...

### Step 4: Verify
1.  Run the dev server: `npm run dev`
2.  Go to `http://localhost:3000/api-doc`
3.  Select **Mobile** -> **v2** in the UI.
4.  Ensure your new endpoint appears under the correct tag.

---

## 3. Versioning Rules

*   **v1**: Stable, production-ready endpoints. Do not introduce breaking changes here.
*   **v2**: New features or breaking changes.
    *   If you are upgrading an endpoint (e.g., `/follow/list`), create the new version at `/api/mobile/v2/follow/list`.
    *   The `split-openapi.cjs` script automatically groups paths starting with `/api/mobile/v2/` into the **Mobile v2** documentation view.

## 4. Authentication

*   All protected endpoints must include the security definition:
    ```json
    "security": [
      { "bearerAuth": [] }
    ]
    ```
*   The API Documentation UI (`/api-doc`) automatically persists your Bearer token across different views (Mobile v1 ↔ Mobile v2 ↔ Admin). You only need to login once per session.
