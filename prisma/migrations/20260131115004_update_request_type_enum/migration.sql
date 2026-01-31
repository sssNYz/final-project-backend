/*
  Warnings:

  - The values [HELP,IMPROVEMENT] on the enum `USER_REQUEST_REQUEST_TYPE` will be removed. If these variants are still used in the database, this will fail.

*/

-- Step 1: Add new enum values first (expand the enum)
ALTER TABLE `USER_REQUEST` MODIFY `REQUEST_TYPE` ENUM('PROBLEM', 'HELP', 'IMPROVEMENT', 'ADD_MEDICINE', 'NOTIFICATION', 'FUNCTION', 'OTHER') NOT NULL;

-- Step 2: Update existing data from old values to new values
UPDATE `USER_REQUEST` SET `REQUEST_TYPE` = 'OTHER' WHERE `REQUEST_TYPE` = 'HELP';
UPDATE `USER_REQUEST` SET `REQUEST_TYPE` = 'OTHER' WHERE `REQUEST_TYPE` = 'IMPROVEMENT';

-- Step 3: Remove old enum values (contract the enum)
ALTER TABLE `USER_REQUEST` MODIFY `REQUEST_TYPE` ENUM('PROBLEM', 'ADD_MEDICINE', 'NOTIFICATION', 'FUNCTION', 'OTHER') NOT NULL;
