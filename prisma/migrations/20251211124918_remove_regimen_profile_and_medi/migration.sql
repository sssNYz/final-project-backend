/*
  Warnings:

  - You are about to drop the column `MEDI_ID` on the `USER_MEDICINE_REGIMEN` table. All the data in the column will be lost.
  - You are about to drop the column `MEDI_NICKNAME` on the `USER_MEDICINE_REGIMEN` table. All the data in the column will be lost.
  - You are about to drop the column `PICTURE_OPTION` on the `USER_MEDICINE_REGIMEN` table. All the data in the column will be lost.
  - You are about to drop the column `PROFILE_ID` on the `USER_MEDICINE_REGIMEN` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `USER_MEDICINE_REGIMEN` DROP FOREIGN KEY `USER_MEDICINE_REGIMEN_MEDI_ID_fkey`;

-- DropForeignKey
ALTER TABLE `USER_MEDICINE_REGIMEN` DROP FOREIGN KEY `USER_MEDICINE_REGIMEN_PROFILE_ID_fkey`;

-- DropIndex
DROP INDEX `USER_MEDICINE_REGIMEN_MEDI_ID_fkey` ON `USER_MEDICINE_REGIMEN`;

-- DropIndex
DROP INDEX `USER_MEDICINE_REGIMEN_PROFILE_ID_fkey` ON `USER_MEDICINE_REGIMEN`;

-- AlterTable
ALTER TABLE `USER_MEDICINE_REGIMEN` DROP COLUMN `MEDI_ID`,
    DROP COLUMN `MEDI_NICKNAME`,
    DROP COLUMN `PICTURE_OPTION`,
    DROP COLUMN `PROFILE_ID`;
