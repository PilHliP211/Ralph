import { z } from "zod";

export const featureListItemSchema = z
  .object({
    description: z.string().min(1),
    tests: z.array(z.string().min(1)).min(1),
    passes: z.boolean(),
    category: z.string().min(1).optional()
  })
  .strict();

export const featureListSchema = z.array(featureListItemSchema).min(1);

export type FeatureListItem = z.infer<typeof featureListItemSchema>;
export type FeatureList = z.infer<typeof featureListSchema>;
