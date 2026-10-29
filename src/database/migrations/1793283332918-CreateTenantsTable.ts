import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantsTable1793283332918 implements MigrationInterface {
  name = 'CreateTenantsTable1793283332918';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          CREATE EXTENSION IF NOT EXISTS "pgcrypto"
        `);
    await queryRunner.query(`
            CREATE TABLE "tenants" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying(120) NOT NULL,
                "subdomain" character varying(63) NOT NULL,
                "business_type" character varying(32) NOT NULL,
                "country" character(2) NOT NULL DEFAULT 'PE',
                "currency" character(3) NOT NULL DEFAULT 'PEN',
                "timezone" character varying(64) NOT NULL DEFAULT 'America/Lima',
                "primary_color" character varying(7),
                "status" character varying(16) NOT NULL DEFAULT 'ACTIVE',
                "paid_until" date,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_tenants_timezone_not_blank" CHECK (btrim("timezone") <> ''),
                CONSTRAINT "CHK_tenants_name_not_blank" CHECK (btrim("name") <> ''),
                CONSTRAINT "CHK_tenants_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$'),
                CONSTRAINT "CHK_tenants_country_format" CHECK ("country" ~ '^[A-Z]{2}$'),
                CONSTRAINT "CHK_tenants_primary_color_format" CHECK (
                    "primary_color" IS NULL
                    OR "primary_color" ~ '^#[0-9A-Fa-f]{6}$'
                ),
                CONSTRAINT "CHK_tenants_status" CHECK ("status" IN ('ACTIVE', 'SUSPENDED')),
                CONSTRAINT "CHK_tenants_business_type" CHECK (
                    "business_type" IN (
                        'GROCERY_STORE',
                        'BAKERY',
                        'RETAIL_STORE',
                        'OTHER'
                    )
                ),
                CONSTRAINT "CHK_tenants_subdomain_format" CHECK (
                    "subdomain" ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'
                ),
                CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_tenants_subdomain" ON "tenants" ("subdomain")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."UQ_tenants_subdomain"
        `);
    await queryRunner.query(`
            DROP TABLE "tenants"
        `);
  }
}
