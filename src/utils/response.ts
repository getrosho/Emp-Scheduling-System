import { NextResponse } from "next/server";
import { AppError, isAppError } from "./errors";

type ResponsePayload<T> = {
  success: boolean;
  data: T | null;
  error: { message: string; details?: unknown } | null;
};

export function jsonResponse<T>(
  data: T | null,
  { status = 200, error }: { status?: number; error?: AppError | Error | null } = {},
) {
  const payload: ResponsePayload<T> = {
    success: !error,
    data: error ? null : data,
    error: error ? { message: error.message, details: (error as AppError).details } : null,
  };

  return NextResponse.json(payload, { status });
}

export function handleRouteError(error: unknown) {
  // Log detailed error information first
  console.error("[handleRouteError] Processing error:", error);
  
  if (isAppError(error)) {
    console.error("[handleRouteError] AppError detected, status:", error.status);
    return jsonResponse(null, { status: error.status, error });
  }

  // Log detailed error information
  if (error instanceof Error) {
    console.error("[handleRouteError] Error name:", error.name);
    console.error("[handleRouteError] Error message:", error.message);
    console.error("[handleRouteError] Error stack:", error.stack);
  }
  
  // Try to extract more information from Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as any;
    console.error("[handleRouteError] Prisma error code:", prismaError.code);
    console.error("[handleRouteError] Prisma error meta:", prismaError.meta);
    
    // Handle specific Prisma error codes
    if (prismaError.code === "P2021") {
      const fallback = new AppError(
        "Database table does not exist. Please run migrations: npx prisma migrate dev",
        500,
        { code: prismaError.code, meta: prismaError.meta }
      );
      return jsonResponse(null, { status: 500, error: fallback });
    }
    
    if (prismaError.code === "P2025") {
      const fallback = new AppError(
        "Record not found in database",
        404,
        { code: prismaError.code }
      );
      return jsonResponse(null, { status: 404, error: fallback });
    }
  }

  // Include error details in response for development
  const errorMessage = error instanceof Error 
    ? error.message 
    : (error && typeof error === "object" && "message" in error)
    ? String((error as any).message)
    : "Internal server error";
    
  const errorDetails = process.env.NODE_ENV === "development" && error instanceof Error 
    ? { stack: error.stack, name: error.name }
    : undefined;
  
  const fallback = new AppError(errorMessage, 500, errorDetails);
  console.error("[handleRouteError] Returning error response:", {
    message: fallback.message,
    status: fallback.status,
    hasDetails: !!fallback.details,
  });
  
  return jsonResponse(null, { status: fallback.status, error: fallback });
}

