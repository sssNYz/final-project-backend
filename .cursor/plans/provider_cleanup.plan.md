---

name: Provider cleanup (both -> email,google)

overview: One-time DB cleanup to convert legacy `UserAccount.provider='both'` to canonical `email,google`. No schema change required.

notes:

  - Canonical stored values: `email` | `google` | `email,google`
  - Backend already normalizes legacy `both` on write/read; this cleanup makes the DB consistent.

todos:

  - id: confirm-target-db

content: Confirm which database to run on (local/staging/prod) and obtain connection/credentials.

status: pending

  - id: preflight-count

content: Run a read-only count of rows where PROVIDER='both' (and optionally sample a few userIds/emails).

status: pending

dependencies: [confirm-target-db]

  - id: backup-or-snapshot

content: Take a backup/snapshot (required for staging/prod) before applying update.

status: pending

dependencies: [confirm-target-db]

  - id: apply-update

content: Run UPDATE to set PROVIDER='email,google' where PROVIDER='both'.

status: pending

dependencies: [preflight-count, backup-or-snapshot]

  - id: post-verify

content: Re-run count to ensure PROVIDER='both' is 0; spot-check affected rows; optionally hit sync/me endpoints.

status: pending

dependencies: [apply-update]

  - id: rollback-plan

content: Keep rollback instructions ready (restore from backup or reverse update if needed).

status: pending

dependencies: [backup-or-snapshot]

---

# Provider cleanup (both -> email,google)

## Scope

- Table: `USER_ACCOUNT`
- Column: `PROVIDER`
- Change: `'both'` → `'email,google'`
- Schema note: `prisma/schema.prisma` already documents the canonical value as `email,google`; no migration is required.

## Preflight (read-only)

```sql
SELECT COUNT(*) AS legacy_both_count
FROM USER_ACCOUNT
WHERE PROVIDER = 'both';
```

Optional spot-check:

```sql
SELECT USER_ID, USER_EMAIL, PROVIDER
FROM USER_ACCOUNT
WHERE PROVIDER = 'both'
LIMIT 20;
```

## Backup / safety

- Local: optional (recommended if you care about the data).
- Staging/Prod: take a DB snapshot/backup before running the update.

## Apply update

Use the prepared SQL file: `prisma/normalize_provider_both_to_email_google.sql`

Or run directly:

```sql
UPDATE USER_ACCOUNT
SET PROVIDER = 'email,google'
WHERE PROVIDER = 'both';
```

## Post-verify

```sql
SELECT COUNT(*) AS legacy_both_count
FROM USER_ACCOUNT
WHERE PROVIDER = 'both';
```

Optional: verify distribution:

```sql
SELECT PROVIDER, COUNT(*) AS cnt
FROM USER_ACCOUNT
GROUP BY PROVIDER
ORDER BY cnt DESC;
```

## Rollback

- Preferred: restore from the snapshot/backup taken before the change.
- If you must reverse without a backup: only possible if you recorded which rows were changed (not recommended; backup is safer).