/**
 * Utility functions for safely extracting and rendering error messages
 */

/**
 * Safely extracts an error message from various error types
 * @param error - Error object, string, or unknown type
 * @param fallback - Fallback message if error cannot be extracted
 * @returns Safe string representation of the error
 */
export function getErrorMessage(error: unknown, fallback = "An error occurred"): string {
  if (!error) {
    return fallback;
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message || fallback;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error || fallback;
  }

  // Handle objects with message property
  if (typeof error === "object" && error !== null) {
    // Check for nested error structures
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }

    // Check for error.error.message pattern
    if ("error" in error) {
      const errorObj = (error as { error: unknown }).error;
      if (
        typeof errorObj === "object" &&
        errorObj !== null &&
        "message" in errorObj &&
        typeof (errorObj as { message: unknown }).message === "string"
      ) {
        return (errorObj as { message: string }).message;
      }
    }

    // Check for response.data.error.message pattern
    if ("response" in error) {
      const responseObj = (error as { response: unknown }).response;
      if (typeof responseObj === "object" && responseObj !== null) {
        const response = responseObj as { data?: unknown };
        if (response.data && typeof response.data === "object" && response.data !== null) {
          const data = response.data as Record<string, unknown>;
          
          // Check for data.error.message
          if (
            "error" in data &&
            typeof data.error === "object" &&
            data.error !== null &&
            "message" in data.error &&
            typeof (data.error as { message: unknown }).message === "string"
          ) {
            return (data.error as { message: string }).message;
          }

          // Check for data.message
          if ("message" in data && typeof data.message === "string") {
            return data.message;
          }
        }
      }
    }

    // Check for Zod validation errors
    if (
      "issues" in error &&
      Array.isArray((error as { issues: unknown }).issues) &&
      (error as { issues: unknown[] }).issues.length > 0
    ) {
      const issues = (error as { issues: Array<{ path?: unknown[]; message?: unknown }> }).issues;
      return issues
        .map((issue) => {
          const path = Array.isArray(issue.path) ? issue.path.join(".") : "field";
          const message = typeof issue.message === "string" ? issue.message : "Invalid value";
          return `${path}: ${message}`;
        })
        .join(", ");
    }

    // Check for details property
    if ("details" in error && typeof (error as { details: unknown }).details === "string") {
      return (error as { details: string }).details;
    }
  }

  // Fallback: try to stringify
  try {
    const stringified = String(error);
    return stringified !== "[object Object]" ? stringified : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely renders an error in JSX
 * @param error - Error object, string, or unknown type
 * @param fallback - Fallback message if error cannot be extracted
 * @returns Safe string for JSX rendering
 */
export function renderError(error: unknown, fallback = "An error occurred"): string {
  return getErrorMessage(error, fallback);
}

