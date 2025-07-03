import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const profileRouter = createTRPCRouter({
  // Get all profiles with their latest follower counts
  getAll: publicProcedure.query(async ({ ctx }) => {
    const profiles = await ctx.db.profile.findMany({
      include: {
        followerCounts: {
          orderBy: { timestamp: "desc" },
          take: 1, // Only get the latest count
        },
      },
      orderBy: { name: "asc" },
    });

    // Transform data to include latest follower count directly
    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      instagramUrl: profile.instagramUrl,
      profileImage: profile.profileImage,
      followerCount: profile.followerCounts[0]?.count ?? 0,
      lastUpdated: profile.followerCounts[0]?.timestamp ?? profile.createdAt,
    }));
  }),

  // Get a single profile with all its follower history
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({
        where: { id: input.id },
        include: {
          followerCounts: {
            orderBy: { timestamp: "desc" },
          },
        },
      });

      return profile;
    }),

  // Create a new profile
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        instagramUrl: z.string().url(),
        profileImage: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.profile.create({
        data: {
          name: input.name,
          instagramUrl: input.instagramUrl,
          profileImage: input.profileImage,
        },
      });
    }),

  // Update profile image
  updateImage: publicProcedure
    .input(
      z.object({
        id: z.string(),
        profileImage: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.profile.update({
        where: { id: input.id },
        data: { profileImage: input.profileImage },
      });
    }),

  // Add a new follower count entry
  addFollowerCount: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
        count: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.followerCount.create({
        data: {
          profileId: input.profileId,
          count: input.count,
          timestamp: new Date(),
        },
      });
    }),

  // Get follower history for a specific profile
  getFollowerHistory: publicProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.followerCount.findMany({
        where: { profileId: input.profileId },
        orderBy: { timestamp: "desc" },
        take: 30, // Last 30 entries
      });
    }),
});