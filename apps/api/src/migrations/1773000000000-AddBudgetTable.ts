import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBudgetTable1773000000000 implements MigrationInterface {
  name = 'AddBudgetTable1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "budgets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "groupId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "month" integer NOT NULL,
        "year" integer NOT NULL,
        "limitAmount" numeric(10,2) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_budgets_group_category_month_year" UNIQUE ("groupId", "categoryId", "month", "year"),
        CONSTRAINT "PK_budgets" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_group"
       FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_category"
       FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_category"`);
    await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_group"`);
    await queryRunner.query(`DROP TABLE "budgets"`);
  }
}
