import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLocationsTable1793287429881 implements MigrationInterface {
  name = 'CreateLocationsTable1793287429881';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "locations" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "tenant_id" uuid NOT NULL,
                "name" character varying(120) NOT NULL,
                "is_main" boolean NOT NULL DEFAULT false,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_locations_name_not_blank" CHECK (btrim("name") <> ''),
                CONSTRAINT "PK_locations" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_locations_main_per_tenant" ON "locations" ("tenant_id")
            WHERE "is_main" = true
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_locations_tenant_id" ON "locations" ("tenant_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "locations"
            ADD CONSTRAINT "FK_locations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "locations" DROP CONSTRAINT "FK_locations_tenant"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_locations_tenant_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."UQ_locations_main_per_tenant"
        `);
    await queryRunner.query(`
            DROP TABLE "locations"
        `);
  }
}
