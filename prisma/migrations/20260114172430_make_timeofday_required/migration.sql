/*
  Warnings:

  - You are about to drop the column `TIME` on the `USER_MEDICINE_REGIMEN_TIME` table. All the data in the column will be lost.
  - Made the column `TIME_OF_DAY` on table `USER_MEDICINE_REGIMEN_TIME` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `USER_MEDICINE_REGIMEN_TIME` DROP COLUMN `TIME`,
    MODIFY `TIME_OF_DAY` VARCHAR(191) NOT NULL;
