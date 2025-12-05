import { z } from "zod";

export const createLocationSchema = z.object({
  label: z.string().min(2),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

