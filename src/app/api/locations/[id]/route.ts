import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { updateLocationSchema } from "@/lib/validations";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Location ID is required", 400);
    }

    const location = await prisma.workLocation.findUnique({
      where: { id },
      include: { shifts: true },
    });
    if (!location) {
      throw new AppError("Location not found", 404);
    }
    return jsonResponse({ location });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Only ADMIN can update locations
    await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Location ID is required", 400);
    }

    const body = await req.json();
    const payload = updateLocationSchema.parse(body);

    const location = await prisma.workLocation.update({
      where: { id },
      data: payload,
    });

    return jsonResponse({ location });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Only ADMIN can delete locations
    await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Location ID is required", 400);
    }

    // Check if location has associated shifts or employees
    const location = await prisma.workLocation.findUnique({
      where: { id },
      include: { 
        shifts: true,
        employeesPreferred: true,
      },
    });

    if (!location) {
      throw new AppError("Location not found", 404);
    }

    if (location.shifts && location.shifts.length > 0) {
      throw new AppError(
        `Cannot delete location: ${location.shifts.length} shift(s) are associated with this location. Please remove or reassign these shifts first.`,
        400
      );
    }

    if (location.employeesPreferred && location.employeesPreferred.length > 0) {
      throw new AppError(
        `Cannot delete location: ${location.employeesPreferred.length} employee(s) have this location as a preferred location. Please remove this location from their preferences first.`,
        400
      );
    }

    try {
      await prisma.workLocation.delete({ where: { id } });
      return jsonResponse({ deleted: true, message: "Location permanently deleted" });
    } catch (deleteError: any) {
      // Handle Prisma foreign key constraint errors
      if (deleteError && typeof deleteError === "object" && "code" in deleteError) {
        const prismaError = deleteError as any;
        if (prismaError.code === "P2003") {
          // Foreign key constraint failed
          throw new AppError(
            "Cannot delete location: It is still referenced by other records. Please remove all associations first.",
            400
          );
        }
        if (prismaError.code === "P2025") {
          // Record not found
          throw new AppError("Location not found", 404);
        }
        // Log other Prisma errors for debugging
        console.error("Prisma delete error:", {
          code: prismaError.code,
          message: prismaError.message,
          meta: prismaError.meta,
        });
        throw new AppError(
          `Cannot delete location: ${prismaError.message || "Database constraint violation"}`,
          400
        );
      }
      throw deleteError;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}

