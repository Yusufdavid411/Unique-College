import axios from "axios";
import { sessionScope, sessionToken } from "./session.js";
import { reportApiError } from "./notifications.js";
export { apiErrorMessage } from "./errorMessages.js";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const FILE_TRANSFER_TIMEOUT = 240000;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) config.timeout = FILE_TRANSFER_TIMEOUT;
  const token = sessionToken(sessionScope(window.location.pathname));
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  if (typeof Blob !== "undefined" && error.response?.data instanceof Blob && error.response.data.size < 65536) {
    try { error.response.data = JSON.parse(await error.response.data.text()); } catch {}
  }
  if (error.config?.notifyOnError !== false) reportApiError(error);
  return Promise.reject(error);
});

export function assetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/school-assets/")) return path;
  return `${API_BASE_URL}${path}`;
}
