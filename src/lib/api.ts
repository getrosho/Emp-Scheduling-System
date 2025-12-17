import axios from "axios";

const api = axios.create({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth headers (placeholder - will be replaced with actual session later)
api.interceptors.request.use((config) => {
  // For now, add placeholder headers for development
  // TODO: Replace with actual session/auth token
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");
    if (userId && userRole) {
      config.headers["x-user-id"] = userId;
      config.headers["x-user-role"] = userRole;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Pass through the error so request() can handle it
    return Promise.reject(error);
  },
);

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { message: string; details?: unknown } | null;
};

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

async function request<T>(method: HttpMethod, url: string, data?: unknown, config = {}) {
  try {
    const response = await api.request<ApiResponse<T>>({
      method,
      url,
      data,
      ...config,
    });

    // Check if response data exists and has the expected structure
    if (!response.data || typeof response.data !== "object") {
      throw { 
        message: "Invalid API response format",
        status: response.status,
      };
    }

    if (!response.data.success) {
      const error = response.data.error ?? { message: "Unknown API error" };
      // Ensure we throw a plain object, not an Error instance
      throw {
        message: error.message || "Unknown API error",
        details: error.details,
      };
    }

    return response.data.data as T;
  } catch (error: any) {
    // Handle axios errors (non-2xx responses)
    if (error.response) {
      const status = error.response?.status;
      const apiResponse = error.response.data;
      
      // Log full error for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("API Error Response:", {
          status,
          data: apiResponse,
          dataType: typeof apiResponse,
          dataKeys: apiResponse && typeof apiResponse === "object" ? Object.keys(apiResponse) : "N/A",
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          responseHeaders: error.response?.headers,
        });
      }
      
      // FIRST: Check if response matches expected ApiResponse format (even if it looks empty)
      // This handles cases where the response has the structure but might appear empty
      if (apiResponse && typeof apiResponse === "object") {
        // Check if it's in the expected ApiResponse format
        if ("success" in apiResponse || "error" in apiResponse || "data" in apiResponse) {
          const typedResponse = apiResponse as ApiResponse<T>;
          
          // If response has an error, throw it with proper structure (this handles 404s properly)
          if (typedResponse.error) {
            const errorMessage = typedResponse.error.message || "Unknown API error";
            const errorDetails = typedResponse.error.details;
            const errorObj: { message: string; details?: unknown; status?: number } = { 
              message: errorMessage,
              status: status,
            };
            if (errorDetails !== undefined) {
              errorObj.details = errorDetails;
            }
            throw errorObj;
          }
          
          // If success is false, there should be an error
          if (typedResponse.success === false) {
            const errorMessage = typedResponse.error?.message || "Unknown API error";
            throw { 
              message: errorMessage,
              status: status,
              details: typedResponse.error?.details,
            };
          }
          
          // If we have a valid response structure with data, return it
          return typedResponse.data as T;
        }
      }
      
      // SECOND: Handle empty or undefined response data (only if not in expected format)
      if (!apiResponse || (typeof apiResponse === "object" && Object.keys(apiResponse).length === 0)) {
        const statusMessage = status === 401 
          ? "Unauthorized. Please check your authentication."
          : status === 403
          ? "Forbidden. You don't have permission to access this resource."
          : status === 404
          ? "Resource not found."
          : status === 500
          ? "Internal server error. Check server logs for details. This may indicate a database schema issue - try running: npx prisma migrate dev"
          : status === 503
          ? "Service unavailable. Database connection may be down."
          : `Request failed with status ${status || "unknown"}`;
        
        // Log additional context for debugging
        if (process.env.NODE_ENV === "development") {
          console.error("[API Client] Empty response details:", {
            url: error.config?.url,
            method: error.config?.method,
            status,
            responseHeaders: error.response?.headers,
            apiResponse,
          });
        }
        
        throw { 
          message: statusMessage,
          status,
          url: error.config?.url,
        };
      }
      
      // THIRD: Response doesn't match expected format - might be a different error format
      if (apiResponse && typeof apiResponse === "object") {
        const errorMessage = (apiResponse as any)?.message || 
                            (apiResponse as any)?.error?.message || 
                            `Request failed with status ${status || 500}`;
        throw { 
          message: errorMessage,
          status: status,
        };
      } else {
        // Response data is not an object
        throw { 
          message: `Request failed with status ${status || 500}. Unexpected response format.`,
          status: status,
        };
      }
    }
    
    // Handle cases where error.response exists but error.response.data is undefined/null/empty
    if (error.response) {
      const status = error.response.status;
      if (!error.response.data || (typeof error.response.data === "object" && Object.keys(error.response.data).length === 0)) {
        const statusMessage = status === 401 
          ? "Unauthorized. Please check your authentication."
          : status === 403
          ? "Forbidden. You don't have permission to access this resource."
          : status === 404
          ? "Resource not found."
          : status === 500
          ? "Internal server error."
          : `Request failed with status ${status || "unknown"}`;
        
        throw { 
          message: statusMessage,
          status,
        };
      }
    }
    
    // Handle network errors or other axios errors
    if (error.request && !error.response) {
      throw { message: "Network error: Unable to reach the server. Please check your connection." };
    }
    
    // Fallback error handling
    throw { message: error.message || "An unexpected error occurred" };
  }
}

export const apiClient = {
  get: <T>(url: string, config = {}) => request<T>("get", url, undefined, config),
  post: <T>(url: string, data?: unknown, config = {}) => request<T>("post", url, data, config),
  put: <T>(url: string, data?: unknown, config = {}) => request<T>("put", url, data, config),
  patch: <T>(url: string, data?: unknown, config = {}) => request<T>("patch", url, data, config),
  delete: <T>(url: string, config = {}) => request<T>("delete", url, undefined, config),
};


