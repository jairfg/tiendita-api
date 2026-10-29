import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1793291066432 implements MigrationInterface {
  name = 'CreateUsersTable1793291066432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "tenant_id" uuid NOT NULL,
                "first_name" character varying(80) NOT NULL,
                "last_name" character varying(120) NOT NULL,
                "email" character varying(254) NOT NULL,
                "password_hash" text NOT NULL,
                "status" character varying(16) NOT NULL DEFAULT 'ACTIVE',
                "last_login_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_users_last_name_not_blank" CHECK (btrim("last_name") <> ''),
                CONSTRAINT "CHK_users_first_name_not_blank" CHECK (btrim("first_name") <> ''),
                CONSTRAINT "CHK_users_status" CHECK ("status" IN ('ACTIVE', 'DISABLED')),
                CONSTRAINT "CHK_users_email_format" CHECK ("email" ~ '^[^@]+@[^@]+$'),
                CONSTRAINT "CHK_users_email_normalized" CHECK ("email" = lower(btrim("email"))),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP CONSTRAINT "FK_users_tenant"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_users_tenant_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."UQ_users_email"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
