import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("unique_college_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function assetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/school-assets/")) return path;
  return `${API_BASE_URL}${path}`;
}

export function apiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const response = error.response?.data;

  if (response?.errors && typeof response.errors === "object") {
    const details = Object.entries(response.errors)
      .flatMap(([field, messages]) => (Array.isArray(messages) ? messages.map((message) => `${field}: ${message}`) : []))
      .join(" ");
    return details ? `${response.message || fallback}. ${details}` : response.message || fallback;
  }

  if (response?.message) return response.message;
  if (error.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (!error.response) return "The server could not be reached. Please wait a moment and try again.";

  return fallback;
}
