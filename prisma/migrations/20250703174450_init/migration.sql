-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instagramUrl" TEXT NOT NULL,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerCount" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_instagramUrl_key" ON "Profile"("instagramUrl");

-- CreateIndex
CREATE INDEX "Profile_name_idx" ON "Profile"("name");

-- CreateIndex
CREATE INDEX "Profile_instagramUrl_idx" ON "Profile"("instagramUrl");

-- CreateIndex
CREATE INDEX "FollowerCount_profileId_idx" ON "FollowerCount"("profileId");

-- CreateIndex
CREATE INDEX "FollowerCount_timestamp_idx" ON "FollowerCount"("timestamp");

-- CreateIndex
CREATE INDEX "FollowerCount_profileId_timestamp_idx" ON "FollowerCount"("profileId", "timestamp");

-- AddForeignKey
ALTER TABLE "FollowerCount" ADD CONSTRAINT "FollowerCount_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
