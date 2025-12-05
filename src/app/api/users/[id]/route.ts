import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, requireAuth } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validations";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { weeklyLimits: true, availability: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return jsonResponse({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req, [Role.ADMIN, Role.MANAGER]);
    const { id } = await params;
    const body = await req.json();
    const payload = updateUserSchema.parse(body);

    // Prevent managers from changing roles (especially to ADMIN)
    if (payload.role !== undefined && actor.role !== Role.ADMIN) {
      throw new AppError("Only administrators can modify user roles", 403);
    }

    // Prevent managers from granting ADMIN role even if they somehow bypass the above
    if (payload.role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new AppError("Only administrators can grant ADMIN privileges", 403);
    }

    const data: Record<string, unknown> = { ...payload };
    if (payload.password) {
      data.passwordHash = await hashPassword(payload.password);
      delete (data as { password?: string }).password;
    }
    if (payload.weeklyCapMinutes) {
      data.weeklyLimits = {
        upsert: {
          create: { weeklyCapMinutes: payload.weeklyCapMinutes },
          update: { weeklyCapMinutes: payload.weeklyCapMinutes },
        },
      };
      delete data.weeklyCapMinutes;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { weeklyLimits: true },
    });

    return jsonResponse({ user: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;

    await prisma.user.delete({
      where: { id },
    });

    return jsonResponse({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

