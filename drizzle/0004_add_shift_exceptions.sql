CREATE TABLE "shift_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"occurrence_date" date NOT NULL,
	"action" text DEFAULT 'cancelled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shift_exceptions" ADD CONSTRAINT "shift_exceptions_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shift_exceptions_shift_id_idx" ON "shift_exceptions" USING btree ("shift_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_exceptions_shift_id_occurrence_date_unique" ON "shift_exceptions" USING btree ("shift_id","occurrence_date");--> statement-breakpoint
