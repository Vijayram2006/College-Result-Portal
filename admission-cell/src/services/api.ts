/**
 * The result server's API for the admission cell (version 1). The session token from sign-in is sent with every
 * request; an expired session goes back to the sign-in page.
 */

export const API_ROOT = ((import.meta as any).env?.VITE_API_URL || "http://localhost:8080/api").replace(/\/+$/, "");
const API = `${API_ROOT}/v1`;
export const TOKEN_KEY = "kvell_admission_token";
export const USER_KEY = "kvell_admission_user";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: any) {
    super(message);
  }
}

export async function api<T>(method: string, path: string, body?: unknown, raw = false): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. It may still be starting; please try again in a minute.", null);
  }
  if (raw && res.ok) return (await res.blob()) as unknown as T;
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.assign("/login");
    }
    throw new ApiError(res.status, (data && (data.error || data.message)) || `Request failed (${res.status})`, data);
  }
  return data as T;
}

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  return e instanceof ApiError ? e.message : fallback;
}
