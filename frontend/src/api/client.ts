// Em dev, "/api" é reescrito pelo proxy do Vite (vite.config.ts) pro backend
// local. Em produção (backend e frontend são serviços Railway separados, sem
// proxy reverso na frente do frontend estático), VITE_API_URL aponta direto
// pra URL pública do backend — setado como variável de build no Railway.
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Erro na API (status ${status})`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;
  const headers = isFormData || !hasBody ? options.headers : { "Content-Type": "application/json", ...options.headers };
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

/** Para respostas binárias (ex.: exportação .xlsx) — não tenta parsear como JSON. */
async function requestBlob(path: string, options: RequestInit = {}): Promise<{ blob: Blob; filename: string | null }> {
  const hasBody = options.body !== undefined && options.body !== null;
  const headers = hasBody ? { "Content-Type": "application/json", ...options.headers } : options.headers;
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  return { blob: await response.blob(), filename: match?.[1] ?? null };
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  postBlob: (path: string, body?: unknown) => requestBlob(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
