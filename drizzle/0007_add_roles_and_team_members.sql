DO $$
BEGIN
	CREATE TYPE "public"."user_role" AS ENUM('system_admin', 'scheduler', 'receptionist');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'receptionist' NOT NULL;--> statement-breakpoint
UPDATE "user"
SET "role" = 'system_admin'
WHERE lower("name") LIKE 'edwards%'
	OR lower("email") LIKE 'edwards%';--> statement-breakpoint
WITH first_user AS (
	SELECT "id"
	FROM "user"
	ORDER BY "created_at", "id"
	LIMIT 1
)
UPDATE "user"
SET "role" = 'system_admin'
WHERE "id" = (SELECT "id" FROM first_user)
	AND NOT EXISTS (
		SELECT 1
		FROM "user"
		WHERE "role" = 'system_admin'
	);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#16a34a' NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
WITH numbered_locations AS (
	SELECT
		"id",
		"name",
		"color",
		"user_id",
		"created_at",
		"updated_at",
		row_number() OVER (PARTITION BY lower("name") ORDER BY "id") AS duplicate_index
	FROM "locations"
)
INSERT INTO "team_members" (
	"id",
	"name",
	"color",
	"created_by_user_id",
	"updated_by_user_id",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	CASE
		WHEN duplicate_index = 1 THEN "name"
		ELSE "name" || ' ' || duplicate_index::text
	END,
	"color",
	"user_id",
	"user_id",
	"created_at",
	"updated_at"
FROM numbered_locations
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
SELECT setval(
	pg_get_serial_sequence('"team_members"', 'id'),
	COALESCE((SELECT max("id") FROM "team_members"), 1),
	true
);--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'team_members_created_by_user_id_user_id_fk'
	) THEN
		ALTER TABLE "team_members" ADD CONSTRAINT "team_members_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'team_members_updated_by_user_id_user_id_fk'
	) THEN
		ALTER TABLE "team_members" ADD CONSTRAINT "team_members_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_created_by_user_id_idx" ON "team_members" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_name_unique" ON "team_members" USING btree ("name");--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "updated_by_user_id" text;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'shifts'
			AND column_name = 'user_id'
	) THEN
		UPDATE "shifts"
		SET
			"created_by_user_id" = "user_id",
			"updated_by_user_id" = "user_id"
		WHERE "created_by_user_id" IS NULL
			OR "updated_by_user_id" IS NULL;
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'shifts_created_by_user_id_user_id_fk'
	) THEN
		ALTER TABLE "shifts" ADD CONSTRAINT "shifts_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'shifts_updated_by_user_id_user_id_fk'
	) THEN
		ALTER TABLE "shifts" ADD CONSTRAINT "shifts_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_user_id_location_id_locations_user_id_id_fk";--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_location_id_locations_id_fk";--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_user_id_user_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "shifts_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "shifts_location_id_idx";--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'shifts'
			AND column_name = 'location_id'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'shifts'
			AND column_name = 'team_member_id'
	) THEN
		ALTER TABLE "shifts" RENAME COLUMN "location_id" TO "team_member_id";
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "shifts" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'shifts_team_member_id_team_members_id_fk'
	) THEN
		ALTER TABLE "shifts" ADD CONSTRAINT "shifts_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE restrict ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_team_member_id_idx" ON "shifts" USING btree ("team_member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_created_by_user_id_idx" ON "shifts" USING btree ("created_by_user_id");--> statement-breakpoint
DROP TABLE IF EXISTS "locations";
