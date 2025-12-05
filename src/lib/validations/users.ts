import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const userFilterSchema = z.object({
  role: z.nativeEnum(Role).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
  skills: z.array(z.string()).optional(),
  profileImage: z.string().url().optional(),
  weeklyCapMinutes: z.number().int().positive().max(10080).optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).optional(),
  });

