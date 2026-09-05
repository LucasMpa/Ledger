CREATE TYPE "public"."category" AS ENUM('groceries', 'food', 'transport', 'health', 'home', 'leisure', 'clothing', 'services', 'other');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('photo', 'manual');--> statement-breakpoint
CREATE TABLE "extraction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"raw_llm_json" jsonb NOT NULL,
	"parsed_ok" boolean DEFAULT true NOT NULL,
	"error_code" text,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"confidence" real,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extraction_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_name" text NOT NULL,
	"merchant_key" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"category" "category" NOT NULL,
	"occurred_on" date NOT NULL,
	"payment_method" text,
	"confidence" real,
	"source" "transaction_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_cents_positive" CHECK ("transactions"."amount_cents" > 0),
	CONSTRAINT "transactions_currency_len" CHECK (char_length("transactions"."currency") = 3)
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "extraction_logs" ADD CONSTRAINT "extraction_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extraction_logs_user_created_at_idx" ON "extraction_logs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_user_occurred_on_idx" ON "transactions" USING btree ("user_id","occurred_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_user_category_idx" ON "transactions" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "transactions_user_merchant_key_idx" ON "transactions" USING btree ("user_id","merchant_key");--> statement-breakpoint
CREATE POLICY "extraction_logs_owner" ON "extraction_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("extraction_logs"."user_id" = (select auth.uid())) WITH CHECK ("extraction_logs"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "transactions_owner" ON "transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("transactions"."user_id" = (select auth.uid())) WITH CHECK ("transactions"."user_id" = (select auth.uid()));