import axios from "axios";

const baseURL = "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL,
});

axiosInstance.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("access");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired (401) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");
        if (!refresh) throw new Error("No refresh token");

        const res = await axios.post(`${baseURL}/api/token/refresh/`, { refresh });
        localStorage.setItem("access", res.data.access);

        // Retry the failed request
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.warn("Token refresh failed:", refreshError);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }


      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
