import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Remove this when Post model is removed from schema
      return { id: 1, name: input.name, createdAt: new Date(), updatedAt: new Date() };
    }),

  getLatest: publicProcedure.query(async ({ ctx }) => {
    // TODO: Remove this when Post model is removed from schema
    return null;
  }),
});
