import axios, { AxiosError } from "axios";

import { API_BASE_URL } from "./deployment-config";

export { API_BASE_URL } from "./deployment-config";

export const SESSION_STORAGE_KEY = "ctic_cmp_session";

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  full_name?: string | null;
  roles: string[];
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45_000,
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return config;
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;

    if (session.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401
    ) {
      window.dispatchEvent(new Event("ctic:unauthorized"));
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    return "Có lỗi xảy ra. Vui lòng thử lại.";
  }

  const data = error.response?.data as
    | { message?: string | string[] }
    | undefined;

  if (Array.isArray(data?.message)) {
    return data.message.join("; ");
  }

  if (data?.message) {
    return data.message;
  }

  if (error.code === "ECONNABORTED") {
    return "Yêu cầu mất quá 45 giây. Máy chủ hoặc SQL Server đang phản hồi chậm; dữ liệu có thể đã được xử lý, vui lòng kiểm tra danh sách trước khi gửi lại.";
  }

  if (!error.response) {
    return `Không kết nối được backend tại ${API_BASE_URL}.`;
  }

  return "Yêu cầu không thực hiện được. Vui lòng thử lại.";
}
