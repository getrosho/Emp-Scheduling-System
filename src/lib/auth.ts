import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";

const DEFAULT_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.SUBCONTRACTOR];

export type SessionUser = {
  id: string;
  role: Role;
};

export async function requireAuth(
  req: NextRequest,
  allowedRoles: Role[] = DEFAULT_ROLES,
): Promise<SessionUser> {
  const userId = req.headers.get("x-user-id");
  const userRoleHeader = req.headers.get("x-user-role");

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  // Security: Missing role header should cause authentication failure, not grant admin privileges
  if (!userRoleHeader) {
    throw new AppError("Unauthorized: Missing role header", 401);
  }

  const role = userRoleHeader as Role;
  if (!allowedRoles.includes(role)) {
    throw new AppError("Forbidden", 403);
  }

  // Verify user exists in database (for development, create if needed)
  const { prisma } = await import("@/lib/db");
  let user = await prisma.user.findUnique({ where: { id: userId } });
  
  // In development, create the user if it doesn't exist
  if (!user && process.env.NODE_ENV === "development" && userId.startsWith("dev-")) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@dev.local`,
        passwordHash: "dev-hash", // Not used in dev mode
        name: "Dev User",
        role: role,
      },
    });
  }
  
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { id: user.id, role: user.role };
}

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

