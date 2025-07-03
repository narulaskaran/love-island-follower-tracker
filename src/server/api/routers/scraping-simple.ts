import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const scrapingRouter = createTRPCRouter({
  // Simple test endpoint
  test: publicProcedure
    .query(() => {
      return {
        success: true,
        message: "Scraping router is working!",
      };
    }),

  // Test database access
  testDb: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        const count = await ctx.db.profile.count();
        return {
          success: true,
          message: `Database connected. Found ${count} profiles.`,
          profileCount: count,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});