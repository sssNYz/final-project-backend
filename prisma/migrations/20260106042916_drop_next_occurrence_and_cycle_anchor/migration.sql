/*
  Warnings:

  - The values [SNOOZ] on the enum `MEDICATION_LOG_RESPONSE_STATUS` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `CYCLE_ANCHOR_DATE` on the `USER_MEDICINE_REGIMEN` table. All the data in the column will be lost.
  - You are about to drop the column `NEXT_OCCURRENCE_AT` on the `USER_MEDICINE_REGIMEN` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `MEDICATION_LOG` MODIFY `RESPONSE_STATUS` ENUM('TAKE', 'SKIP', 'SNOOZE') NULL;

-- AlterTable
ALTER TABLE `USER_MEDICINE_REGIMEN` DROP COLUMN `CYCLE_ANCHOR_DATE`,
    DROP COLUMN `NEXT_OCCURRENCE_AT`;
