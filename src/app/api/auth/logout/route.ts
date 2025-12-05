import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    return jsonResponse({ message: "Logged out" });
  } catch (error) {
    return handleRouteError(error);
  }
}

