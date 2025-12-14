# Swagger UI / OpenAPI Structure Guidelines

Purpose: keep API docs readable and consistent across Mobile and Admin. These rules apply to all new and updated endpoints.

## Where Things Live

- Spec file: `public/openapi.json`
- Docs page: `app/api-doc/route.ts` (Swagger UI, light theme, Examples hidden)

UI features on the docs page:
- Quick filters: All / Mobile / Admin (uses built-in filter)
- Bearer token quick-auth box (persists across refresh)
- Models section hidden; response examples hidden (request editor stays visible)

## Categories (Mobile vs Admin)

- Path prefixes (must):
  - Mobile: `/api/mobile/v1/...`
  - Admin: `/api/admin/v1/...`
- Tags (must):
  - Use one tag per operation that encodes the client and feature.
  - Preferred pattern: `Mobile - {Feature}` and `Admin - {Feature}`.
  - Keep feature names short and stable (e.g., `Auth`, `Users`, `Profiles`).
  - Define all tags in the top‑level `tags` array with clear descriptions.

Example tag definitions:

```json
"tags": [
  { "name": "Admin - Auth", "description": "Admin authentication and management" },
  { "name": "Admin - Medicine", "description": "Admin medicine database management" },
  { "name": "Mobile - Auth", "description": "Mobile authentication and account sync" },
  { "name": "Mobile - Users", "description": "Mobile user profile operations" }
]
```

Note: Swagger UI groups by tag. Using the `Admin - ...` / `Mobile - ...` prefix clusters related endpoints together and keeps the list easy to scan. The filter buttons on the docs page rely on this naming.

## Endpoint Authoring Rules

For each path/method in `public/openapi.json`:

1. Path + version
   - Mobile endpoints: `/api/mobile/v1/{feature}/{action}`
   - Admin endpoints: `/api/admin/v1/{feature}/{action}`
   - Use `v1` until a breaking change requires `v2`.

2. Tags (required)
   - Exactly one tag per operation, using the patterns above.

3. Summary and description
   - `summary`: one concise line.
   - `description`: brief, actionable context (what it does, important notes).

4. Security
   - Protected endpoints must include: `"security": [{ "bearerAuth": [] }]`.
   - Reuse the shared scheme in `components.securitySchemes.bearerAuth`.

5. Request body
   - Define the schema under `application/json` (or `multipart/form-data` where needed).
   - Use `type`, `properties`, and `required`. Add `format`/`enum` when useful.
- Do NOT include `example` or `examples` (Examples are not allowed; keep schemas concise).

6. Responses
   - Document all meaningful status codes (2xx, 4xx, 5xx) with schemas.
   - Reuse shared models via `$ref` from `components.schemas`.
   - Errors must use the shared `ErrorResponse` schema.

7. Parameters
   - Path params in `{curly}` must be declared in `parameters` with `in: "path"` and `required: true`.
   - Query params go in `parameters` with `in: "query"`.

8. Deprecation
   - Mark deprecated operations with `"deprecated": true` and keep their docs until removed in the next major version.

## Common Patterns (Recommended)

### List endpoints (pagination + sorting)

For list endpoints that can return many rows, prefer these **query params**:

- `page` (integer, default 1)
- `pageSize` (integer, default 10)
- `order` (string, allow `A-Z`, `Z-A`, `asc`, `desc`; default `A-Z`)

If you also support search/filter, document them as optional query params, for example:

- `search` (string) → searches in multiple name fields
- `mediType` (enum: `ORAL`, `TOPICAL`) → filter by medicine type

### Detail endpoints (get by id)

For a “get detail” endpoint, document exactly one required identifier:

- Query param style (project pattern): `mediId` in query
  - Example path: `/api/admin/v1/medicine/detail?mediId=123`

### Upload endpoints (multipart/form-data)

If an endpoint accepts an image upload (Admin create/update), use:

- `requestBody.content["multipart/form-data"]`
- Add `format: "binary"` for file fields
- Do NOT add examples; keep schemas concise

## Reusable Components (components.schemas)

- Name schemas by domain and shape (e.g., `PublicUserAccount`, `UserProfile`, `SigninResponse`).
- Keep schemas normalized and reference them via `$ref` from paths.
- Standard error shape (must):

```json
"ErrorResponse": {
  "type": "object",
  "properties": {
    "error": { "type": "string" },
    "message": { "type": "string" }
  }
}
```

## Examples Policy (No Examples in UI)

- Do NOT add `example` or `examples` fields in request/response schemas.
- The docs page is configured to hide Example panels and the Models section for readability.
- Prefer clear `description` fields and precise schemas over inline examples.

## Sorting and Readability

- Operations and tags are sorted alphabetically in the UI.
- Use short, action‑oriented `summary` lines.
- Keep descriptions focused; avoid repeating the summary.

## Optional: Tag Groups (for tools that support it)

Swagger UI doesn’t render tag groups, but other tools (like ReDoc) may. If helpful for external consumers, you can add this optional block:

```json
"x-tagGroups": [
  { "name": "Mobile", "tags": ["Mobile - Auth", "Mobile - Users"] },
  { "name": "Admin",  "tags": ["Admin - Auth"] }
]
```

## Checklist When Adding an Endpoint

- [ ] Path under the correct prefix (`/api/mobile/v1` or `/api/admin/v1`).
- [ ] One correct tag (`Mobile - {Feature}` or `Admin - {Feature}`).
- [ ] Concise `summary` and a clear `description`.
- [ ] `security` with `bearerAuth` if protected.
- [ ] Request body schema defined; no `example(s)`.
- [ ] All responses documented with schemas, reusing shared models.
- [ ] Error responses use `ErrorResponse`.
- [ ] Adds/updates any needed `components.schemas`.

## Notes

- The docs page enforces a light theme and hides Examples for clarity.
- If you need to preview, run the app and visit `/api-doc`.
- This guide supersedes previous notes that encouraged adding inline examples.
