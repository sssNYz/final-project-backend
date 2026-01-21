-- Step 2: Convert existing TIME DateTime to TIME_OF_DAY string (HH:MM format)
-- Extract hours and minutes from TIME column and format as "HH:MM"
UPDATE `USER_MEDICINE_REGIMEN_TIME`
SET `TIME_OF_DAY` = CONCAT(
  LPAD(HOUR(`TIME`), 2, '0'),
  ':',
  LPAD(MINUTE(`TIME`), 2, '0')
)
WHERE `TIME_OF_DAY` IS NULL AND `TIME` IS NOT NULL;
