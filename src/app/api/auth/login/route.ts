import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { verifyPassword } from "@/lib/auth";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const match = await verifyPassword(payload.password, user.passwordHash);
    if (!match) {
      throw new AppError("Invalid credentials", 401);
    }

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      token: "session-placeholder",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

