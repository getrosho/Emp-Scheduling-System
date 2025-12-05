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
  if (isAppError(error)) {
    return jsonResponse(null, { status: error.status, error });
  }

  // Log detailed error information
  console.error("Unhandled error:", error);
  if (error instanceof Error) {
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }
  
  // Try to extract more information from Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    console.error("Error code:", (error as any).code);
    console.error("Error meta:", (error as any).meta);
  }

  // Include error details in response for development
  const errorMessage = error instanceof Error ? error.message : "Internal server error";
  const errorDetails = process.env.NODE_ENV === "development" && error instanceof Error 
    ? { stack: error.stack, name: error.name }
    : undefined;
  
  const fallback = new AppError(errorMessage, 500, errorDetails);
  return jsonResponse(null, { status: fallback.status, error: fallback });
}

