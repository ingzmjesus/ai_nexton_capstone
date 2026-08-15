-- CreateEnum
CREATE TYPE "ticket_category" AS ENUM ('Billing', 'Account Access', 'Technical Issue', 'Product Question', 'Refund', 'Security', 'Other');

-- CreateEnum
CREATE TYPE "ticket_priority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "ticket_sentiment" AS ENUM ('Positive', 'Neutral', 'Negative', 'Frustrated');

-- CreateEnum
CREATE TYPE "suggested_team" AS ENUM ('Billing', 'Account Support', 'Technical Support', 'Product', 'Security', 'General');

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classifications" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "category" "ticket_category" NOT NULL,
    "priority" "ticket_priority" NOT NULL,
    "sentiment" "ticket_sentiment" NOT NULL,
    "summary" TEXT NOT NULL,
    "suggested_team" "suggested_team" NOT NULL,
    "requires_human_review" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classifications_ticket_id_key" ON "classifications"("ticket_id");

-- AddForeignKey
ALTER TABLE "classifications" ADD CONSTRAINT "classifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
