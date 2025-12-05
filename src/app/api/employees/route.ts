import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createEmployeeSchema, employeeFilterSchema } from "@/lib/validations/employees";
import { Role, EmployeeStatus, EmployeeRole } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

/**
 * GET /api/employees
 * List employees with filtering and pagination
 * RBAC: Admin (all), Manager (employees in their locations), Employee (forbidden)
 */
export async function GET(req: NextRequest) {
  try {
    console.log("[Employees GET] Starting request");
    let actor;
    try {
      actor = await requireAuth(req, [Role.ADMIN, Role.MANAGER]);
      console.log("[Employees GET] Auth passed, actor:", actor.id);
    } catch (authError) {
      console.error("[Employees GET] Auth error:", authError);
      throw authError;
    }
    
    // Employees cannot list other employees
    if (actor.role === Role.EMPLOYEE || actor.role === Role.SUBCONTRACTOR) {
      throw new AppError("Forbidden: Employees cannot list other employees", 403);
    }

    let filters;
    try {
      const searchParams = req.nextUrl.searchParams;
      
      // Build filter object with proper type conversion
      const filterParams: any = {};
      
      const roleParam = searchParams.get("role");
      if (roleParam && roleParam !== "" && roleParam !== "ALL") {
        filterParams.role = roleParam;
      }
      
      const statusParam = searchParams.get("status");
      if (statusParam && statusParam !== "") {
        filterParams.status = statusParam;
      }
      
      const locationIdParam = searchParams.get("locationId");
      if (locationIdParam && locationIdParam !== "") {
        filterParams.locationId = locationIdParam;
      }
      
      const subcontractorParam = searchParams.get("subcontractor");
      if (subcontractorParam !== null) {
        filterParams.subcontractor = subcontractorParam === "true";
      }
      
      const qParam = searchParams.get("q");
      if (qParam && qParam !== "") {
        filterParams.q = qParam;
      }
      
      const pageParam = searchParams.get("page");
      if (pageParam && pageParam !== "") {
        filterParams.page = pageParam;
      }
      
      const limitParam = searchParams.get("limit");
      if (limitParam && limitParam !== "") {
        filterParams.limit = limitParam;
      }
      
      console.log("[Employees GET] Filter params:", filterParams);
      
      const parseResult = employeeFilterSchema.safeParse(filterParams);
      
      if (!parseResult.success) {
        console.error("[Employees GET] Validation errors:", JSON.stringify(parseResult.error.issues, null, 2));
        throw new AppError(
          `Invalid filter parameters: ${parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
          400
        );
      }
      
      filters = parseResult.data;
      console.log("[Employees GET] Parsed filters:", filters);
    } catch (parseError: any) {
      console.error("[Employees GET] Filter parse error:", parseError);
      if (parseError instanceof AppError) {
        throw parseError;
      }
      throw new AppError(
        `Invalid filter parameters: ${parseError.message || "Validation failed"}`,
        400
      );
    }
    
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Subcontractor filter
    if (filters.subcontractor !== undefined) {
      where.subcontractor = filters.subcontractor;
    }

    // Search query (name or email)
    if (filters.q) {
      where.OR = [
        { fullName: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    // Manager scope: filter by preferred locations
    // Note: This assumes managers have access to certain locations
    // If location-based access control needs to be implemented, add a manager-location relation
    if (actor.role === Role.MANAGER && filters.locationId) {
      where.preferredLocations = {
        some: {
          id: filters.locationId,
        },
      };
    }

    console.log("[Employees GET] Where clause:", JSON.stringify(where, null, 2));
    console.log("[Employees GET] Querying employees...");

    try {
      // First, try a simple query to test if Prisma client is working
      console.log("[Employees GET] Testing Prisma connection...");
      const testCount = await prisma.employee.count();
      console.log("[Employees GET] Test count:", testCount);

      // Try to fetch employees with minimal includes first
      console.log("[Employees GET] Fetching employees...");
      let employees;
      let total;
      
      try {
        [employees, total] = await Promise.all([
          prisma.employee.findMany({
            where,
            include: {
              preferredLocations: {
                select: {
                  id: true,
                  label: true,
                  name: true,
                },
              },
              availability: {
                select: {
                  id: true,
                  day: true,
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                  timezone: true,
                },
              },
            },
            orderBy: {
              fullName: "asc",
            },
            skip,
            take: limit,
          }),
          prisma.employee.count({ where }),
        ]);
        console.log("[Employees GET] Query successful, found", employees.length, "employees");
      } catch (queryErr: any) {
        console.error("[Employees GET] Prisma query failed:", queryErr);
        console.error("[Employees GET] Error code:", queryErr.code);
        console.error("[Employees GET] Error meta:", JSON.stringify(queryErr.meta, null, 2));
        throw queryErr;
      }
      
      // Sort availability client-side to avoid Prisma orderBy issues
      const employeesWithSortedAvailability = employees.map(emp => {
        const sortedAvailability = emp.availability?.sort((a, b) => {
          const dayOrder: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };
          const aOrder = a.dayOfWeek ?? dayOrder[a.day as string] ?? 999;
          const bOrder = b.dayOfWeek ?? dayOrder[b.day as string] ?? 999;
          return aOrder - bOrder;
        }) || [];
        
        return {
          ...emp,
          availability: sortedAvailability,
        };
      });

      console.log("[Employees GET] Preparing response...");
      const responseData = {
        employees: employeesWithSortedAvailability,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
      
      console.log("[Employees GET] Response data prepared, returning...");
      return jsonResponse(responseData);
    } catch (queryError) {
      console.error("[Employees GET] Query error:", queryError);
      if (queryError instanceof Error) {
        console.error("[Employees GET] Query error name:", queryError.name);
        console.error("[Employees GET] Query error message:", queryError.message);
        console.error("[Employees GET] Query error stack:", queryError.stack);
      }
      if (queryError && typeof queryError === "object" && "code" in queryError) {
        console.error("[Employees GET] Prisma error code:", (queryError as any).code);
        console.error("[Employees GET] Prisma error meta:", JSON.stringify((queryError as any).meta, null, 2));
      }
      throw queryError;
    }
  } catch (error) {
    console.error("[Employees GET] ========== ERROR CAUGHT ==========");
    console.error("[Employees GET] Error type:", typeof error);
    console.error("[Employees GET] Error:", error);
    
    if (error instanceof Error) {
      console.error("[Employees GET] Error name:", error.name);
      console.error("[Employees GET] Error message:", error.message);
      console.error("[Employees GET] Error stack:", error.stack);
    }
    
    if (error && typeof error === "object") {
      console.error("[Employees GET] Error keys:", Object.keys(error));
      if ("code" in error) {
        console.error("[Employees GET] Prisma error code:", (error as any).code);
      }
      if ("meta" in error) {
        console.error("[Employees GET] Prisma error meta:", JSON.stringify((error as any).meta, null, 2));
      }
    }
    
    console.error("[Employees GET] ==================================");
    
    try {
      return handleRouteError(error);
    } catch (handlerError) {
      console.error("[Employees GET] Error handler also failed:", handlerError);
      // Fallback: return a basic error response
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: error instanceof Error ? error.message : "Internal server error",
          },
        },
        { status: 500 }
      );
    }
  }
}

/**
 * POST /api/employees
 * Create a new employee
 * RBAC: Admin (full), Manager (employees in their locations)
 */
export async function POST(req: NextRequest) {
  try {
    console.log("[Employees POST] Starting request");
    const actor = await requireAuth(req, [Role.ADMIN, Role.MANAGER]);
    console.log("[Employees POST] Auth passed, actor:", actor.id);
    
    // Employees cannot create other employees
    if (actor.role === Role.EMPLOYEE || actor.role === Role.SUBCONTRACTOR) {
      throw new AppError("Forbidden: Employees cannot create other employees", 403);
    }

    const body = await req.json();
    console.log("[Employees POST] Request body:", JSON.stringify(body, null, 2));
    const payload = createEmployeeSchema.parse(body);
    console.log("[Employees POST] Parsed payload:", JSON.stringify(payload, null, 2));

    // Check if email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: payload.email },
    });

    if (existingEmployee) {
      throw new AppError("Employee with this email already exists", 409);
    }

    // Managers cannot assign ADMIN or MANAGER roles
    if (actor.role === Role.MANAGER && (payload.role === EmployeeRole.ADMIN || payload.role === EmployeeRole.MANAGER)) {
      throw new AppError("Forbidden: Managers cannot assign ADMIN or MANAGER roles", 403);
    }

    // Validate preferred locations exist
    if (payload.preferredLocationIds && payload.preferredLocationIds.length > 0) {
      const locations = await prisma.workLocation.findMany({
        where: { id: { in: payload.preferredLocationIds } },
      });

      if (locations.length !== payload.preferredLocationIds.length) {
        throw new AppError("One or more preferred locations not found", 404);
      }

      // Manager scope: verify they have access to these locations
      // Note: This is a placeholder - implement proper location-based access control
      if (actor.role === Role.MANAGER) {
        // For now, allow managers to assign any location
        // TODO: Implement manager-location relationship check
      }
    }

    // Map DayOfWeek enum to dayOfWeek integer
    const dayToInt: Record<string, number> = {
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
      SUN: 0,
    };

    // Prepare data for creation
    const employeeData: any = {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      status: payload.status,
      notes: payload.notes,
      role: payload.role,
      subcontractor: payload.subcontractor,
      weeklyLimitHours: payload.weeklyLimitHours,
      preferredLocations: payload.preferredLocationIds.length > 0
        ? {
            connect: payload.preferredLocationIds.map((id) => ({ id })),
          }
        : undefined,
    };

    console.log("[Employees POST] Creating employee with data:", JSON.stringify(employeeData, null, 2));
    const employee = await prisma.employee.create({
      data: employeeData,
      include: {
        preferredLocations: true,
        availability: true,
      },
    });
    console.log("[Employees POST] Employee created:", employee.id);

    // Create availability entries (7 entries, including null ones)
    if (payload.availability && payload.availability.length === 7) {
      // Find or create corresponding User by email (Availability model requires userId)
      let user = await prisma.user.findUnique({
        where: { email: employee.email },
        select: { id: true },
      });

      // If user doesn't exist, create one (for development/testing)
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: employee.email,
            passwordHash: "temp-hash", // Will need to be set properly later
            name: employee.fullName,
            role: Role.EMPLOYEE, // Default role
          },
          select: { id: true },
        });
      }

      const availabilityToCreate = payload.availability
        .filter((av) => av.start && av.end)
        .map((slot) => ({
          employeeId: employee.id,
          userId: user.id,
          day: slot.day,
          dayOfWeek: dayToInt[slot.day] ?? 0,
          startTime: slot.start!,
          endTime: slot.end!,
          timezone: "UTC",
        }));

      if (availabilityToCreate.length > 0) {
        await prisma.availability.createMany({
          data: availabilityToCreate,
        });
      }
    }

    // Fetch employee with all relations
    const employeeWithRelations = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        preferredLocations: true,
          availability: {
            orderBy: {
              dayOfWeek: "asc",
            },
          },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CREATE_EMPLOYEE",
        entityType: "Employee",
        entityId: employeeWithRelations!.id,
        meta: {
          email: employeeWithRelations!.email,
          role: employeeWithRelations!.role,
        },
      },
    });

    console.log("[Employees POST] Success, returning employee");
    return jsonResponse({ employee: employeeWithRelations }, { status: 201 });
  } catch (error) {
    console.error("[Employees POST] Error caught:", error);
    if (error instanceof Error) {
      console.error("[Employees POST] Error name:", error.name);
      console.error("[Employees POST] Error message:", error.message);
      console.error("[Employees POST] Error stack:", error.stack);
    }
    if (error && typeof error === "object" && "code" in error) {
      console.error("[Employees POST] Prisma error code:", (error as any).code);
      console.error("[Employees POST] Prisma error meta:", (error as any).meta);
    }
    return handleRouteError(error);
  }
}

