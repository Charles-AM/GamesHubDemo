CREATE TABLE "User" (
 "id" TEXT NOT NULL, "email" TEXT NOT NULL, "username" TEXT NOT NULL,
 "passwordHash" TEXT, "googleId" TEXT, "xp" INTEGER NOT NULL DEFAULT 0,
 "streak" INTEGER NOT NULL DEFAULT 0, "lastLogin" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE TABLE "Match" (
 "id" TEXT NOT NULL, "clientId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "game" TEXT NOT NULL, "score" INTEGER NOT NULL, "duration" INTEGER NOT NULL,
 "playedAt" TIMESTAMP(3) NOT NULL, "ranked" BOOLEAN NOT NULL DEFAULT false,
 "opponent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Match_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Match_userId_clientId_key" ON "Match"("userId", "clientId");
CREATE INDEX "Match_userId_playedAt_idx" ON "Match"("userId", "playedAt" DESC);
CREATE INDEX "Match_game_ranked_score_idx" ON "Match"("game", "ranked", "score" DESC);
ALTER TABLE "Match" ADD CONSTRAINT "Match_score_nonnegative" CHECK ("score" >= 0);
ALTER TABLE "Match" ADD CONSTRAINT "Match_duration_nonnegative" CHECK ("duration" >= 0);
