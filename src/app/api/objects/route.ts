import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { createObjectSchema } from "@/lib/validations/objects";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const objects = await prisma.workLocation.findMany({
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ objects });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only ADMIN can create objects
    await requireAuth(req, [Role.ADMIN]);
    const body = await req.json();
    const payload = createObjectSchema.parse(body);

    const object = await prisma.workLocation.create({ data: payload });
    return jsonResponse({ object }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

