import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { scrapeInstagramProfile } from "@/lib/instagram-scraper";

export const scrapingRouter = createTRPCRouter({
  // Update follower counts for all profiles
  updateAllFollowerCounts: publicProcedure
    .mutation(async ({ ctx }) => {
      console.log("🚀 Starting follower count update for all profiles...");
      
      try {
        // Get all profiles from database
        console.log("📊 Fetching profiles from database...");
        const profiles = await ctx.db.profile.findMany({
          select: {
            id: true,
            name: true,
            instagramUrl: true,
          },
        });
        console.log(`📊 Found ${profiles.length} profiles in database`);

        if (profiles.length === 0) {
          return {
            success: true,
            message: "No profiles found to update",
            results: [],
          };
        }

        console.log(`📊 Found ${profiles.length} profiles to update`);

        const results = [];
        
        // Process each profile sequentially to avoid rate limiting
        for (const profile of profiles) {
          console.log(`🔍 Scraping ${profile.name} (${profile.instagramUrl})`);
          
          try {
            const scrapingResult = await scrapeInstagramProfile(profile.instagramUrl);
            
            if (scrapingResult.success && scrapingResult.data) {
              const { followerCount, profileImageUrl } = scrapingResult.data;
              
              // Update profile image if we got a new one
              if (profileImageUrl) {
                await ctx.db.profile.update({
                  where: { id: profile.id },
                  data: { profileImage: profileImageUrl },
                });
              }
              
              // Add new follower count record
              await ctx.db.followerCount.create({
                data: {
                  profileId: profile.id,
                  count: followerCount,
                  timestamp: new Date(),
                },
              });
              
              results.push({
                profileId: profile.id,
                name: profile.name,
                success: true,
                followerCount,
                profileImageUrl,
              });
              
              console.log(`✅ ${profile.name}: ${followerCount.toLocaleString()} followers`);
            } else {
              results.push({
                profileId: profile.id,
                name: profile.name,
                success: false,
                error: scrapingResult.error,
              });
              
              console.log(`❌ ${profile.name}: ${scrapingResult.error}`);
            }
            
            // Add delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            results.push({
              profileId: profile.id,
              name: profile.name,
              success: false,
              error: errorMessage,
            });
            
            console.log(`❌ ${profile.name}: ${errorMessage}`);
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        console.log(`🏁 Update complete: ${successCount} successful, ${errorCount} errors`);
        
        return {
          success: true,
          message: `Updated ${successCount} profiles successfully. ${errorCount} errors.`,
          results,
          summary: {
            total: profiles.length,
            successful: successCount,
            errors: errorCount,
          },
        };
        
      } catch (error) {
        console.error("❌ Failed to update follower counts:", error);
        return {
          success: false,
          message: "Failed to update follower counts",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Update follower count for a specific profile
  updateProfileFollowerCount: publicProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log(`🔍 Updating follower count for profile: ${input.profileId}`);
      
      try {
        // Get profile from database
        const profile = await ctx.db.profile.findUnique({
          where: { id: input.profileId },
          select: {
            id: true,
            name: true,
            instagramUrl: true,
          },
        });

        if (!profile) {
          return {
            success: false,
            error: "Profile not found",
          };
        }

        console.log(`📱 Scraping ${profile.name} (${profile.instagramUrl})`);
        
        const scrapingResult = await scrapeInstagramProfile(profile.instagramUrl);
        
        if (!scrapingResult.success || !scrapingResult.data) {
          return {
            success: false,
            error: scrapingResult.error ?? "Failed to scrape profile",
          };
        }

        const { followerCount, profileImageUrl } = scrapingResult.data;
        
        // Update profile image if we got a new one
        if (profileImageUrl) {
          await ctx.db.profile.update({
            where: { id: profile.id },
            data: { profileImage: profileImageUrl },
          });
        }
        
        // Add new follower count record
        const followerCountRecord = await ctx.db.followerCount.create({
          data: {
            profileId: profile.id,
            count: followerCount,
            timestamp: new Date(),
          },
        });
        
        console.log(`✅ ${profile.name}: ${followerCount.toLocaleString()} followers`);
        
        return {
          success: true,
          data: {
            profileId: profile.id,
            name: profile.name,
            followerCount,
            profileImageUrl,
            timestamp: followerCountRecord.timestamp,
          },
        };
        
      } catch (error) {
        console.error(`❌ Failed to update profile ${input.profileId}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Test scraping for a specific Instagram URL (development only)
  testScraping: publicProcedure
    .input(z.object({ instagramUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      console.log(`🧪 Testing scraping for: ${input.instagramUrl}`);
      
      try {
        const result = await scrapeInstagramProfile(input.instagramUrl);
        
        console.log("Test result:", result);
        
        return result;
      } catch (error) {
        console.error("Test scraping error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Simple test endpoint to verify tRPC is working
  testConnection: publicProcedure
    .query(async ({ ctx }) => {
      console.log("🔗 Testing database connection...");
      
      try {
        const count = await ctx.db.profile.count();
        console.log(`✅ Database connection successful. Found ${count} profiles.`);
        
        return {
          success: true,
          message: `Database connection successful. Found ${count} profiles.`,
          profileCount: count,
        };
      } catch (error) {
        console.error("❌ Database connection error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Test adding mock follower counts without scraping
  testMockUpdate: publicProcedure
    .mutation(async ({ ctx }) => {
      console.log("🧪 Testing mock follower count update...");
      
      try {
        // Get first profile
        const profile = await ctx.db.profile.findFirst({
          select: {
            id: true,
            name: true,
            instagramUrl: true,
          },
        });

        if (!profile) {
          return {
            success: false,
            error: "No profiles found in database",
          };
        }

        // Add mock follower count
        const mockFollowerCount = Math.floor(Math.random() * 50000) + 100000;
        
        await ctx.db.followerCount.create({
          data: {
            profileId: profile.id,
            count: mockFollowerCount,
            timestamp: new Date(),
          },
        });

        console.log(`✅ Added mock follower count for ${profile.name}: ${mockFollowerCount}`);
        
        return {
          success: true,
          message: `Added mock follower count for ${profile.name}: ${mockFollowerCount.toLocaleString()}`,
          data: {
            profileId: profile.id,
            name: profile.name,
            followerCount: mockFollowerCount,
          },
        };
      } catch (error) {
        console.error("❌ Mock update error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});