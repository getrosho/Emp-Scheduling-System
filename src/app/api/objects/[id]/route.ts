import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { updateObjectSchema } from "@/lib/validations/objects";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Object ID is required", 400);
    }

    const object = await prisma.workLocation.findUnique({
      where: { id },
      include: { shifts: true },
    });
    if (!object) {
      throw new AppError("Object not found", 404);
    }
    return jsonResponse({ object });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Only ADMIN can update objects
    await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Object ID is required", 400);
    }

    const body = await req.json();
    const payload = updateObjectSchema.parse(body);

    const object = await prisma.workLocation.update({
      where: { id },
      data: payload,
    });

    return jsonResponse({ object });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Only ADMIN can delete objects
    await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Object ID is required", 400);
    }

    // Check if object has associated shifts or employees
    let object;
    try {
      object = await prisma.workLocation.findUnique({
        where: { id },
        include: { 
          shifts: true,
          employeesPreferred: true,
        },
      });
    } catch (queryError: any) {
      // Handle missing relation table gracefully
      if (queryError?.message?.includes("_EmployeePreferredObjects") || queryError?.message?.includes("does not exist")) {
        console.warn("[Objects DELETE] Relation table missing, retrying without employeesPreferred...");
        object = await prisma.workLocation.findUnique({
          where: { id },
          include: { 
            shifts: true,
          },
        });
        // Add empty employeesPreferred array
        if (object) {
          object = { ...object, employeesPreferred: [] } as any;
        }
      } else {
        throw queryError;
      }
    }

    if (!object) {
      throw new AppError("Object not found", 404);
    }

    if (object.shifts && object.shifts.length > 0) {
      throw new AppError(
        `Cannot delete object: ${object.shifts.length} shift(s) are associated with this object. Please remove or reassign these shifts first.`,
        400
      );
    }

    if (object.employeesPreferred && object.employeesPreferred.length > 0) {
      throw new AppError(
        `Cannot delete object: ${object.employeesPreferred.length} employee(s) have this object as a preferred object. Please remove this object from their preferences first.`,
        400
      );
    }

    try {
      await prisma.workLocation.delete({ where: { id } });
      return jsonResponse({ deleted: true, message: "Object permanently deleted" });
    } catch (deleteError: any) {
      // Handle Prisma foreign key constraint errors
      if (deleteError && typeof deleteError === "object" && "code" in deleteError) {
        const prismaError = deleteError as any;
        if (prismaError.code === "P2003") {
          // Foreign key constraint failed
          throw new AppError(
            "Cannot delete object: It is still referenced by other records. Please remove all associations first.",
            400
          );
        }
        if (prismaError.code === "P2025") {
          // Record not found
          throw new AppError("Object not found", 404);
        }
        // Log other Prisma errors for debugging
        console.error("Prisma delete error:", {
          code: prismaError.code,
          message: prismaError.message,
          meta: prismaError.meta,
        });
        throw new AppError(
          `Cannot delete object: ${prismaError.message || "Database constraint violation"}`,
          400
        );
      }
      throw deleteError;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}

