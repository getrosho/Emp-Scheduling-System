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
    if (error.response?.data) {
      const apiResponse = error.response.data as ApiResponse<T>;
      
      // Log full error for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("API Error Response:", {
          status: error.response?.status,
          data: apiResponse,
          fullError: error,
        });
      }
      
      // Check if response has error object
      if (apiResponse && typeof apiResponse === "object") {
        if (apiResponse.error) {
          const errorMessage = apiResponse.error.message || "Unknown API error";
          const errorDetails = apiResponse.error.details;
          const errorObj: { message: string; details?: unknown } = { message: errorMessage };
          if (errorDetails !== undefined) {
            errorObj.details = errorDetails;
          }
          throw errorObj;
        }
        if (apiResponse.success === false) {
          // When success is false, error should exist, but TypeScript doesn't know this
          const errorMessage = (apiResponse as { error?: { message?: string } }).error?.message || "Unknown API error";
          throw { message: errorMessage };
        }
      }
      
      // If response data exists but doesn't match expected format
      if (Object.keys(apiResponse || {}).length === 0) {
        throw { 
          message: `Request failed with status ${error.response?.status || 500}. Please try again.` 
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


