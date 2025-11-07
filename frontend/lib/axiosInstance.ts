import axios from "axios";

const baseURL = "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL,
});

axiosInstance.interceptors.request.use(request => {
  const access = localStorage.getItem('access');
  if (access) {
    request.headers['Authorization'] = `Bearer ${access}`;
  }
  return request;
}, error => {
  return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
  response => response, // Directly return successful responses.

  async error => {

    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {

      originalRequest._retry = true; // Mark the request as retried to avoid infinite loops.

      try {
        const refreshToken = localStorage.getItem('refreshToken'); // Retrieve the stored refresh token.

        // Make a request to your auth server to refresh the token.
        const response = await axios.post('http://localhost:8000/api/token/refresh/', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Store the new access and refresh tokens.
        localStorage.setItem('access', accessToken);
        localStorage.setItem('refresh', newRefreshToken);

        // Update the authorization header with the new access token.
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        return axiosInstance(originalRequest); // Retry the original request with the new access token.

      } catch (refreshError) {

        // Handle refresh token errors by clearing stored tokens and redirecting to the login page.
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error); // For all other errors, return the error as is.
  }
);

export default axiosInstance;