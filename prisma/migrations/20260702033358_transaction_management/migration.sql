-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Transaction_userId_deletedAt_idx" ON "Transaction"("userId", "deletedAt");
