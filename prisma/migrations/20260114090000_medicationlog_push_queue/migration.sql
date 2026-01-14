/*
  Warnings:

  - A unique constraint covering the columns `[PROFILE_ID, MEDI_REGIMEN_ID, SCHEDULE_TIME]` on the table `MEDICATION_LOG` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `MEDICATION_LOG`
    ADD COLUMN `PUSH_SENT_AT` DATETIME(3) NULL,
    ADD COLUMN `SUPABASE_SENT_AT` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `MEDICATION_LOG_PROFILE_ID_MEDI_REGIMEN_ID_SCHEDULE_TIME_key`
    ON `MEDICATION_LOG`(`PROFILE_ID`, `MEDI_REGIMEN_ID`, `SCHEDULE_TIME`);

