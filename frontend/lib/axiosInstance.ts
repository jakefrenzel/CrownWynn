import axios from "axios";

const baseURL = "http://localhost:8000";

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
        const publicPaths = ["/login", "/register"]; 
        if (typeof window !== "undefined" && !publicPaths.includes(window.location.pathname)) {
          window.location.replace("/login");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;