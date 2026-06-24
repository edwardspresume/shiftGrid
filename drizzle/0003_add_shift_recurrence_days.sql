ALTER TABLE "shifts" ADD COLUMN "recurrence_days" integer[];--> statement-breakpoint
UPDATE "shifts"
SET "recurrence_days" = ARRAY[EXTRACT(DOW FROM "shift_date")::integer]
WHERE "recurrence_frequency" <> 'none';--> statement-breakpoint
