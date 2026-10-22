/**
 * Tiny wrapper around fetch for calling our API.
 *
 * - Always sends cookies (the better-auth session cookie).
 * - Turns error responses ({ error: "..." }) into thrown ApiError objects,
 *   so components can simply show `error.message`.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: isForm ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
  });

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body.error ?? 'Something went wrong', body.code);
  return body as T;
}

/** Shortcut for JSON POST/PATCH/DELETE requests. */
export const send = <T>(method: string, path: string, data?: unknown) =>
  api<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });
