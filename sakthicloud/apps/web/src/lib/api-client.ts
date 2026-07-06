// Typed fetch wrapper — auth header, transparent 401 refresh, structured errors.
// This is the production version of the prototype's hand-rolled `req()` in the
// single HTML file, now typed and centralised.

import { RefreshResponse } from "@sakthicloud/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_URL}/api/v1`;

const ACCESS_KEY = "sc_a";
const REFRESH_KEY = "sc_r";

let accessToken: string | null = null;
let refreshToken: string | null = null;

function loadTokens() {
  try {
    accessToken = accessToken ?? sessionStorage.getItem(ACCESS_KEY);
    refreshToken = refreshToken ?? sessionStorage.getItem(REFRESH_KEY);
  } catch {
    /* storage unavailable */
  }
}
loadTokens();

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  try {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* ignore */
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  try {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

export function isAuthenticated(): boolean {
  return !!accessToken;
}

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function attemptRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = RefreshResponse.parse(await res.json());
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(method: Method, path: string, body?: unknown, retry = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !retry && refreshToken) {
    const ok = await attemptRefresh();
    if (ok) return request<T>(method, path, body, true);
    clearTokens();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && (data.error as string)) || "Request failed";
    // 402 = entitlement missing; the payload carries { addon, upgrade } for the UpgradeGate.
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
