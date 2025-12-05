import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { createLocationSchema } from "@/lib/validations";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const locations = await prisma.workLocation.findMany({
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ locations });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only ADMIN can create locations
    await requireAuth(req, [Role.ADMIN]);
    const body = await req.json();
    const payload = createLocationSchema.parse(body);

    const location = await prisma.workLocation.create({ data: payload });
    return jsonResponse({ location }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

