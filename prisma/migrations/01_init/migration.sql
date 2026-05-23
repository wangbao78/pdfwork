-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "password" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "dailyUsage" INTEGER NOT NULL DEFAULT 0,
  "lastUsageDate" TIMESTAMP(3),
  "totalUsage" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'PENDING',
  "r2Key" TEXT,
  "resultKey" TEXT,
  "error" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "File_userId_idx" ON "File"("userId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
