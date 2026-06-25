ALTER TABLE "locations" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "user_id" text;--> statement-breakpoint
DO $$
DECLARE
	owner_id text;
	unowned_location_count integer;
	unowned_shift_count integer;
BEGIN
	SELECT "id" INTO owner_id
	FROM "user"
	ORDER BY "created_at", "id"
	LIMIT 1;

	IF owner_id IS NOT NULL THEN
		UPDATE "locations"
		SET "user_id" = owner_id
		WHERE "user_id" IS NULL;

		UPDATE "shifts"
		SET "user_id" = owner_id
		WHERE "user_id" IS NULL;
	ELSE
		DELETE FROM "locations"
		WHERE "user_id" IS NULL
			AND (("name" = 'Northern Met' AND "color" = '#16a34a')
				OR ("name" = 'Pine Valley' AND "color" = '#2563eb'))
			AND NOT EXISTS (
				SELECT 1
				FROM "shifts"
				WHERE "shifts"."location_id" = "locations"."id"
			);
	END IF;

	SELECT count(*) INTO unowned_location_count FROM "locations" WHERE "user_id" IS NULL;
	SELECT count(*) INTO unowned_shift_count FROM "shifts" WHERE "user_id" IS NULL;

	IF unowned_location_count > 0 OR unowned_shift_count > 0 THEN
		RAISE EXCEPTION 'Cannot harden schedule ownership: % location row(s) and % shift row(s) are unowned. Seed an owner account first.',
			unowned_location_count,
			unowned_shift_count;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "locations" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "locations_user_id_idx" ON "locations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_user_id_id_unique" ON "locations" USING btree ("user_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_user_id_name_unique" ON "locations" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "shifts_user_id_idx" ON "shifts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_location_id_locations_user_id_id_fk" FOREIGN KEY ("user_id","location_id") REFERENCES "public"."locations"("user_id","id") ON DELETE restrict ON UPDATE no action;
