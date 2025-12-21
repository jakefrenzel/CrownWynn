import axiosInstance from "./axiosInstance";

export const claimAdReward = async () => {
  const response = await axiosInstance.post("/api/user/claim-ad-reward/");
  return response.data;
};

export const checkAdReward = async () => {
  const response = await axiosInstance.get("/api/user/check-ad-reward/");
  return response.data;
};
