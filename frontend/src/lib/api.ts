/** Thin fetch wrapper around the CivicConnect backend.
 *  Cookies carry the session; the browser sends Origin automatically on
 *  state-changing requests (backend CSRF allow-list). */

const BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown[];
  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = opts;
  const url = new URL(BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url.toString(), {
    method,
    credentials: 'include',
    headers: isForm ? {} : body ? { 'Content-Type': 'application/json' } : {},
    body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const env = (data as { error?: { code?: string; message?: string; details?: unknown[] } } | null)
      ?.error;
    throw new ApiError(
      res.status,
      env?.code ?? 'INTERNAL_ERROR',
      env?.message ?? `Request failed (${res.status})`,
      env?.details ?? [],
    );
  }
  return data as T;
}

export const apiGet = <T>(path: string, query?: RequestOptions['query']) =>
  api<T>(path, { method: 'GET', query });
export const apiPost = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body });
export const apiPatch = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
