import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Love Island USA Season 6 contestants (sample data)
  const contestants = [
    {
      name: "Serena Page",
      instagramUrl: "https://instagram.com/serenapage.e",
    },
    {
      name: "Kordell Beckham", 
      instagramUrl: "https://instagram.com/kb_25x",
    },
    {
      name: "Leah Kateb",
      instagramUrl: "https://instagram.com/leahkateb",
    },
    {
      name: "Rob Rausch",
      instagramUrl: "https://instagram.com/rob.rausch",
    },
    {
      name: "JaNa Craig",
      instagramUrl: "https://instagram.com/itsjanaababy",
    },
    {
      name: "Kenny Rodriguez",
      instagramUrl: "https://instagram.com/kennylrodriguez",
    },
    {
      name: "Nicole Jacky",
      instagramUrl: "https://instagram.com/nicolejacky",
    },
    {
      name: "Kendall Washington",
      instagramUrl: "https://instagram.com/kendallwashington_",
    },
  ];

  // Create profiles
  for (const contestant of contestants) {
    const profile = await prisma.profile.upsert({
      where: { instagramUrl: contestant.instagramUrl },
      update: {},
      create: {
        name: contestant.name,
        instagramUrl: contestant.instagramUrl,
        profileImage: null, // Will be populated by scraping
      },
    });

    console.log(`✅ Created/updated profile: ${profile.name}`);

    // Add initial follower count (sample data)
    const initialCount = Math.floor(Math.random() * 100000) + 50000; // Random between 50k-150k
    await prisma.followerCount.create({
      data: {
        profileId: profile.id,
        count: initialCount,
        timestamp: new Date(),
      },
    });

    console.log(`📊 Added initial follower count: ${initialCount.toLocaleString()}`);
  }

  console.log("✨ Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });