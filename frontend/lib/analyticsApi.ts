import axiosInstance from './axiosInstance';

export const getAdminAnalytics = async (params?: {
  start_date?: string;
  end_date?: string;
  game?: 'all' | 'mines' | 'keno';
}) => {
  const response = await axiosInstance.get('/api/admin/analytics/', { params });
  return response.data;
};
