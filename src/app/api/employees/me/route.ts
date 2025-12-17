import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";

/**
 * GET /api/employees/me
 * Get the current user's employee record
 */
export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    console.log("[Employees GET /me] Actor ID:", actor.id);
    
    // Get user to find email
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { email: true, name: true },
      });
    } catch (userErr: any) {
      console.error("[Employees GET /me] Error fetching user:", userErr);
      throw new AppError("Failed to fetch user information", 500);
    }

    if (!user || !user.email) {
      console.error("[Employees GET /me] User or email not found for actor:", actor.id);
      throw new AppError("User email not found", 404);
    }

    console.log("[Employees GET /me] Looking for employee with email:", user.email);

    // Find employee by email
    let employee;
    try {
      employee = await prisma.employee.findFirst({
        where: { email: user.email },
        include: {
          preferredObjects: {
            select: {
              id: true,
              label: true,
            },
          },
        },
      });
    } catch (queryErr: any) {
      console.error("[Employees GET /me] Query error:", queryErr);
      console.error("[Employees GET /me] Error message:", queryErr?.message);
      console.error("[Employees GET /me] Error code:", queryErr?.code);
      
      // If the error is about missing relation table, try without preferredObjects
      if (queryErr?.message?.includes("_EmployeePreferredObjects") || 
          queryErr?.message?.includes("does not exist") ||
          queryErr?.code === "P2021") {
        console.warn("[Employees GET /me] Relation table missing, retrying without preferredObjects...");
        try {
          employee = await prisma.employee.findFirst({
            where: { email: user.email },
          });
          // Add empty preferredObjects array
          if (employee) {
            employee = { ...employee, preferredObjects: [] };
          }
        } catch (retryErr: any) {
          console.error("[Employees GET /me] Retry also failed:", retryErr);
          throw new AppError("Database query failed. Please check database connection.", 500);
        }
      } else {
        throw new AppError(`Database error: ${queryErr?.message || "Unknown error"}`, 500);
      }
    }

    if (!employee) {
      console.warn("[Employees GET /me] Employee record not found for email:", user.email);
      // Return a proper error response - this is expected for managers who haven't been added as employees yet
      const error = new AppError(
        "Employee record not found. Please ensure your user account has a corresponding employee record. Managers can be created using the 'Add New Staff' form.",
        404
      );
      return jsonResponse(null, {
        status: 404,
        error: error,
      });
    }

    console.log("[Employees GET /me] Employee found:", employee.id);
    return jsonResponse({ employee });
  } catch (error) {
    console.error("[Employees GET /me] Outer catch error:", error);
    if (error instanceof Error) {
      console.error("[Employees GET /me] Error name:", error.name);
      console.error("[Employees GET /me] Error message:", error.message);
      console.error("[Employees GET /me] Error stack:", error.stack);
    }
    if (error && typeof error === "object" && "code" in error) {
      console.error("[Employees GET /me] Error code:", (error as any).code);
    }
    
    // Ensure we always return a proper response
    try {
      return handleRouteError(error);
    } catch (handlerError) {
      console.error("[Employees GET /me] Error handler failed:", handlerError);
      // Last resort: return a basic error response
      return jsonResponse(null, {
        status: 500,
        error: new AppError(
          error instanceof Error ? error.message : "Failed to fetch employee record. Please check database connection.",
          500
        ),
      });
    }
  }
}

