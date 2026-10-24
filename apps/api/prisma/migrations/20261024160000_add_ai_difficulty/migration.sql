CREATE TYPE "AiDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

ALTER TABLE "Game" ADD COLUMN "aiDifficulty" "AiDifficulty";
