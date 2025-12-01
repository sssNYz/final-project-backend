/*
  Warnings:

  - A unique constraint covering the columns `[SUPABASE_USER_ID]` on the table `USER_ACCOUNT` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `USER_ACCOUNT` ADD COLUMN `PROVIDER` VARCHAR(191) NULL,
    ADD COLUMN `SUPABASE_USER_ID` VARCHAR(191) NULL,
    MODIFY `USER_PASSWORD` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `USER_ACCOUNT_SUPABASE_USER_ID_key` ON `USER_ACCOUNT`(`SUPABASE_USER_ID`);
