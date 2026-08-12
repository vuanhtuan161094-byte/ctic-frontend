function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizedHttpBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return stripTrailingSlash(url.toString());
  } catch {
    return null;
  }
}

function inferredBrowserApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }

  const { protocol, hostname, port, origin } = window.location;

  // Vite/preview frontend chạy riêng trong môi trường phát triển: backend mặc định ở :3000.
  if (["5173", "4173", "3001"].includes(port)) {
    return `${protocol}//${hostname}:3000`;
  }

  // Khi deploy qua reverse proxy/domain, ưu tiên same-origin để không phải hard-code host/port.
  return stripTrailingSlash(origin);
}

export const API_BASE_URL =
  normalizedHttpBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  inferredBrowserApiBaseUrl();

export const PUBLIC_API_BASE_URL =
  normalizedHttpBaseUrl(import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined) ??
  API_BASE_URL;

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export function buildPublicApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${PUBLIC_API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
