import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, requireAuth } from "@/lib/auth";
import { createUserSchema, userFilterSchema } from "@/lib/validations";
import { Role } from "@/generated/prisma/enums";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const filters = userFilterSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const users = await prisma.user.findMany({
      where: {
        role: filters.role,
      },
      include: { weeklyLimits: true },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ users });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, [Role.ADMIN]);
    const body = await req.json();
    const payload = createUserSchema.parse(body);

    const passwordHash = await hashPassword(payload.password);
    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        name: payload.name,
        phone: payload.phone,
        role: payload.role,
        skills: payload.skills ?? [],
        profileImage: payload.profileImage,
        weeklyLimits: payload.weeklyCapMinutes
          ? {
              create: { weeklyCapMinutes: payload.weeklyCapMinutes },
            }
          : undefined,
      },
      include: { weeklyLimits: true },
    });

    return jsonResponse({ user }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

