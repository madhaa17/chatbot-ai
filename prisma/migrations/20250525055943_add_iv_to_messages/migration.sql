/*
  Warnings:

  - Added the required column `iv` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column with a default value
ALTER TABLE "Message" ADD COLUMN "iv" TEXT DEFAULT 'legacy';

-- Update existing messages to use a default IV
UPDATE "Message" SET "iv" = 'legacy';

-- Now make the column required
ALTER TABLE "Message" ALTER COLUMN "iv" SET NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "iv" DROP DEFAULT;
