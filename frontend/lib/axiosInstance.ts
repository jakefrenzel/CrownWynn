import axios from "axios";

// Read API base from NEXT_PUBLIC_API_BASE (set at build time by Next.js).
// Fallbacks:
// - If NEXT_PUBLIC_API_BASE is provided use it (recommended for prod builds)
// - Otherwise in production use a relative `/api` path (e.g. reverse-proxied)
// - In development fallback to `http://localhost:8000`
const envApiBase = (process.env as any)?.NEXT_PUBLIC_API_BASE;
const baseURL = envApiBase && envApiBase.length > 0
  ? envApiBase
  : (process.env.NODE_ENV === 'production' ? "/api" : "http://localhost:8000");

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // crucial for cookie-based auth
});

// CSRF helper for unsafe methods (POST, PATCH, DELETE)
function getCSRFToken(): string | undefined {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : undefined;
}

// Add CSRF token to modifying requests
axiosInstance.interceptors.request.use(
  (request) => {
    const csrfToken = getCSRFToken();
    if (csrfToken && ["post", "put", "patch", "delete"].includes(request.method ?? "")) {
      request.headers["X-CSRFToken"] = csrfToken;
    }
    return request;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses, but skip redirect on public pages
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any; // widen to allow _retry flag
    const status = error.response?.status;

    // Prevent infinite loop: never retry refresh or login endpoints
    const isAuthEndpoint = originalRequest.url?.includes("/api/refresh/") || 
                           originalRequest.url?.includes("/api/login/");

    // Attempt silent refresh on 401 (expired access token)
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        await axiosInstance.post("/api/refresh/");
        // Retry original request after obtaining new access cookie
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        console.warn("Token refresh failed", refreshErr);
        // Redirect to login if not already on an auth page
        const publicPaths = ["/auth/login", "/auth/register"]; 
        if (typeof window !== "undefined" && !publicPaths.includes(window.location.pathname)) {
          window.location.replace("/auth/login");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;