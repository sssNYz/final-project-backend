-- One-time cleanup (optional):
-- Convert legacy provider value 'both' to canonical 'email,google'.
--
-- Table/column names use MySQL physical names (from Prisma @@map / @map).
UPDATE USER_ACCOUNT
SET PROVIDER = 'email,google'
WHERE PROVIDER = 'both';

