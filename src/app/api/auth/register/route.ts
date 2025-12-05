import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = registerSchema.parse(body);

    // Security: Registration endpoint only creates EMPLOYEE accounts
    // Admin/Manager accounts must be created through authenticated /api/users endpoint
    // Role field is not accepted in registration payload

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        name: payload.name,
        phone: payload.phone,
        role: Role.EMPLOYEE, // Always EMPLOYEE for public registration
        skills: payload.skills ?? [],
        profileImage: payload.profileImage,
        weeklyLimits: payload.weeklyCapMinutes
          ? {
              create: {
                weeklyCapMinutes: payload.weeklyCapMinutes,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return jsonResponse({ user }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

