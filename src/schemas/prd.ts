import { z } from "zod";

export const prdFeatureSchema = z
  .object({
    description: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
    passes: z.boolean(),
    category: z.string().min(1).optional()
  })
  .strict();

export const prdSchema = z.array(prdFeatureSchema).min(1);

export type PrdFeature = z.infer<typeof prdFeatureSchema>;
export type Prd = z.infer<typeof prdSchema>;
