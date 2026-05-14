/*
  Warnings:

  - You are about to drop the column `status` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Voucher` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'fruit',
ALTER COLUMN "image" DROP NOT NULL;

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Voucher";
