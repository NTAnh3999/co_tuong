CREATE TYPE "UserType" AS ENUM ('GUEST', 'REGISTERED');
CREATE TYPE "Color" AS ENUM ('RED', 'BLACK');
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'READY', 'STARTED', 'CLOSED');
CREATE TYPE "GameMode" AS ENUM ('LOCAL', 'AI', 'ONLINE');
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED', 'ABORTED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "type" "UserType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "initialMs" INTEGER NOT NULL,
    "incrementMs" INTEGER NOT NULL,
    "gameId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "color" "Color",
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "mode" "GameMode" NOT NULL,
    "redId" TEXT,
    "blackId" TEXT,
    "initialFen" TEXT NOT NULL,
    "ruleSetVersion" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "gameVersion" INTEGER NOT NULL DEFAULT 0,
    "initialMs" INTEGER,
    "incrementMs" INTEGER,
    "redRemainingMs" INTEGER,
    "blackRemainingMs" INTEGER,
    "activeColor" "Color",
    "turnStartedAt" TIMESTAMP(3),
    "resultWinner" "Color",
    "resultReason" TEXT,
    "finishedAt" TIMESTAMP(3),
    "drawOfferBy" "Color",
    "drawOfferPly" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameMove" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "uci" TEXT NOT NULL,
    "moveId" TEXT NOT NULL,
    "playerId" TEXT,
    "clockAfterMs" INTEGER,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameMove_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameSnapshot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "fen" TEXT NOT NULL,
    "clocksJson" JSONB,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestSession_userId_key" ON "GuestSession"("userId");
CREATE UNIQUE INDEX "GuestSession_tokenHash_key" ON "GuestSession"("tokenHash");
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
CREATE UNIQUE INDEX "Room_gameId_key" ON "Room"("gameId");
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");
CREATE UNIQUE INDEX "GameMove_moveId_key" ON "GameMove"("moveId");
CREATE UNIQUE INDEX "GameMove_gameId_ply_key" ON "GameMove"("gameId", "ply");
CREATE UNIQUE INDEX "GameSnapshot_gameId_ply_key" ON "GameSnapshot"("gameId", "ply");

ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_redId_fkey" FOREIGN KEY ("redId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameMove" ADD CONSTRAINT "GameMove_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameMove" ADD CONSTRAINT "GameMove_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameSnapshot" ADD CONSTRAINT "GameSnapshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
