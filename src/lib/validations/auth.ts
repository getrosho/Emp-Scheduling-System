import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
  // Security: Role field removed from registration schema
  // All registrations default to EMPLOYEE role
  // Admins/Managers must be created through authenticated /api/users endpoint
  skills: z.array(z.string()).default([]),
  profileImage: z.string().url().optional(),
  weeklyCapMinutes: z.number().int().positive().max(10080).optional(), // max 7 days
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

