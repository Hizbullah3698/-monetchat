/*
  Warnings:

  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - Made the column `role_id` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "expires_at" SET DEFAULT NOW() + INTERVAL '30 days';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ALTER COLUMN "role_id" SET NOT NULL;

-- DropEnum
DROP TYPE "UserRole";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
