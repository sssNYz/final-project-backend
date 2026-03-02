## Frontend Guide

This file is for people who work on the **frontend** of this project.
The goal is: same style, easy to read, easy to fix, easy for new people.

---

### 1. Tech stack (frontend)

- **Framework**: Next.js 16 (App Router, folder `app/`)
- **Language**: TypeScript (files end with `.ts` / `.tsx`)
- **UI library**:
  - React 19
  - Radix UI (used inside our `components/ui/*` files)
  - Custom UI kit (similar to shadcn/ui) in `components/ui`
- **Styling**:
  - Tailwind CSS v4 (utility classes, no CSS modules)
  - Theme tokens in `app/globals.css` (for colors, radius, etc.)
- **Icons & charts**:
  - `lucide-react`, `@tabler/icons-react` for icons
  - `recharts` for charts
- **Auth / data**:
  - `supabase-js` client in `lib/supabaseClient.ts`
  - Custom API routes in `app/api/**`

---

### 2. Folder structure (frontend only)

- **`app/`**: All pages and layouts
  - `page.tsx`: main public page
  - `login/page.tsx`: login page (uses `LoginForm`)
  - `signup/page.tsx`: signup page
  - `otp/page.tsx`: OTP page
  - `dashboard/page.tsx`: main app dashboard
- **`components/`**: Reusable pieces
  - `components/ui/*`: base UI parts (button, input, card, field, table, etc.)
  - `login-form.tsx`, `signup-form.tsx`, `otp-form.tsx`: auth forms
  - other shared parts: sidebar, header, charts, section cards…
- **`hooks/`**:
  - `use-mobile.ts`: small React hooks (example: `useIsMobile`)
- **`lib/`**:
  - `utils.ts`: `cn()` helper to join Tailwind classes
  - `supabaseClient.ts`: client for talking to Supabase from the browser
  - other shared helpers
- **`types/`**:
  - Shared TypeScript types for frontend and backend

Rule:  
**New page UI** → goes in `app/...` and `components/...`  
**Shared logic (no JSX)** → `lib/` or `hooks/`  
**Shared visual pieces** → `components/` (or `components/ui/` if very low-level)

---

### 3. Pages (Next.js App Router rules)

- Each route is a **folder inside `app/`** with a `page.tsx` file.
  - Example: `/login` route → `app/login/page.tsx`
- If a page needs a special layout (sidebar, header, etc. only for that route):
  - add `app/<route>/layout.tsx`
- Pages are **server components by default**.
  - Do **not** add `"use client"` at the top unless you must use:
    - `useState`, `useEffect`, `useRouter`, `window`, `localStorage`, etc.

**Rule**:  
Use **server component** for simple display and data fetch.  
Use **client component** only when you need browser things (forms, clicks, local state, localStorage).

---

### 4. Components (how to create and use)

- **File names**
  - Components: `PascalCase` file name when the file exports one main component  
    - example: `LoginForm` in `login-form.tsx` is good
  - Folders: `kebab-case` (all small letters, `-` between words)
- **Where to put**
  - UI building blocks (button, input, card, etc.) → `components/ui/*`
  - Big pieces used on many pages (sidebars, headers, cards) → `components/*`
  - Page-specific parts used in just 1 page → can be inside that route folder or `components/` with clear name
- **Client vs server**
  - If a component uses hooks (`useState`, `useEffect`, `useRouter`, `useIsMobile`, etc.) → first line must be:
    - `"use client"`
  - If not, keep it as server component (no `"use client"`).

**Import style**

- Use the `@` alias from `tsconfig`:
  - `@/components/ui/button`
  - `@/components/login-form`
  - `@/lib/utils`

---

### 5. Styling rules (Tailwind + tokens)

- Use **Tailwind classes** on elements:
  - example: `className="flex flex-col gap-6"`
- When you need to merge many classes or conditional classes, use `cn()` from `lib/utils.ts`:

```tsx
import { cn } from "@/lib/utils"

function Box({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-card p-4", className)} />
}
```

- Use theme tokens (from `globals.css`) in class names:
  - `bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.
  - These respect light / dark mode and design system.
- Do **not** create new random colors in Tailwind classes.  
  Try to use the tokens we already have.

---

### 6. Using our UI kit (`components/ui/*`)

We already have many ready UI parts. **Always check here first**:

- **Buttons**: `Button` from `@/components/ui/button`
  - Variants: `variant="default" | "outline" | "secondary" | "ghost" | "link" | "destructive"`
  - Sizes: `size="sm" | "lg" | "icon" | ...`
- **Inputs & forms**:
  - `Input` from `@/components/ui/input`
  - `Field`, `FieldLabel`, `FieldGroup` from `@/components/ui/field`
  - Use these for all forms (see `LoginForm` for pattern).
- **Cards**: `Card`, `CardHeader`, `CardContent`, etc. from `@/components/ui/card`
- **Layout / navigation**:
  - sidebar, header, nav items in `components/app-sidebar.tsx`, `components/site-header.tsx`, etc.

**Rule**:  
Before adding a new raw `<button>` or `<input>`, check if a UI component already exists in `components/ui`.  
If it exists, **use it**.

---

### 7. Forms and API calls (frontend pattern)

Look at `components/login-form.tsx` as the main example.

- Use **client components** for forms (top line: `"use client"`).
- Use `useState` for input values and loading state.
- On submit:
  - call `e.preventDefault()`
  - validate input (example: email and password not empty)
  - call `fetch("/api/...", { method, headers, body })`
  - parse JSON and show error or redirect
- While waiting:
  - set `isLoading = true`
  - disable inputs and button
  - show `"Loading..."` or similar text

**Error handling**

- Keep an `error` state: `const [error, setError] = useState<string | null>(null)`
- If error: show a small red text under the field or at the bottom.

**Tokens example (like login form)**

- When API returns tokens, we store them in `localStorage`:
  - `localStorage.setItem("accessToken", data.accessToken)`
  - `localStorage.setItem("refreshToken", data.refreshToken)`
- When you call a protected API from the browser:
  - read token from `localStorage`
  - send as header: `Authorization: Bearer <token>`

---

### 8. State and hooks

- Use **React hooks**:
  - `useState` for simple local state
  - `useEffect` for side effects (fetch on mount, listen to window, etc.)
  - `useIsMobile` (from `hooks/use-mobile.ts`) to know if screen is mobile
- No Redux or big state library right now.
- If state is needed in many places:
  - start simple: pass as props
  - if it grows, create a small custom hook in `hooks/` or a context in `components/`

**Rule**:  
Keep components **small and focused**.  
If a component is doing too many things, split it into more components.

---

### 9. How to add a new frontend page (step by step)

Example: you want a new page `/profile`.

1. **Create the route folder**
   - Make folder: `app/profile/`
2. **Create the page file**
   - Add `app/profile/page.tsx`
3. **Decide server or client**
   - If page only shows data (no hooks, no browser-only things) → server:
     - no `"use client"`
   - If page needs `useState`, `useEffect`, `localStorage`, etc. → client:
     - first line in file: `"use client"`
4. **Build UI**
   - Reuse `components/ui/*` (Button, Input, Card, Field…)
   - If the page needs a big custom block, create a new component in `components/` and import it.
5. **Call APIs if needed**
   - For simple things, use `fetch("/api/...")` from your client component.
   - Remember to send tokens if the API is protected.
6. **Style**
   - Use Tailwind classes and theme tokens.
   - Use `cn()` helper when merging classes.

---

### 10. Code style & tools

- **TypeScript**:
  - Always type props and function arguments.
  - Do not use `any` unless there is no other way (and add a comment if you must).
- **Imports**:
  - Use `@/` import path, not long `../../..` paths.
- **Linting**:
  - Run `npm run lint` before commit if possible.
  - Fix simple warnings and errors.
- **Naming**:
  - Components: `PascalCase` names (e.g. `LoginForm`, `OtpForm`).
  - Variables and functions: `camelCase` (e.g. `isLoading`, `handleSubmit`).

---

### 11. Working in a team (frontend rules)

- **Small PRs**:
  - Try to keep changes focused on one thing (one page, one feature).
- **Keep structure**:
  - Follow this guide for where to put files.
  - Reuse patterns from existing pages like `login`, `signup`, `otp`, `dashboard`.
- **Comments**:
  - If something is not clear, add a short comment in code with **simple English**.
- **Ask before adding new libraries**:
  - For UI or state: first try to use what we already have.

---

### 12. For new Next.js / React devs (short tips)

- Read `components/login-form.tsx` slowly.  
  This file is a very good example of:
  - client component
  - form handling
  - loading state
  - error state
  - calling an API
- Use VS Code or a good editor with TypeScript support.
- When you are not sure:
  - Copy the style of existing pages and components.
  - Keep code simple and short.

If you update this guide, keep the language **simple** so all team members can understand it.


