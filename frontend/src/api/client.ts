// ---------------------------------------------------------------------------
// Talking to the FastAPI backend (/api is proxied by Vite in dev and by nginx in Docker)
// ---------------------------------------------------------------------------
import type { Dataset, ItemsOut, Overview, SnapshotDay, SnapshotKind, Summary, Trend, UploadResponse } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function failure(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  const detail = data?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail) && detail[0]?.msg
        ? String(detail[0].msg).replace(/^Value error, /, "")
        : `Request failed (${res.status})`;
  throw new ApiError(message, res.status);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) return failure(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

/** Build a query string, leaving out empty values. */
export function query(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const MAX_UPLOAD_MB = 10;
export const UPLOAD_ACCEPT = ".xlsx,.xlsm";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
export const getSnapshots = () => api<SnapshotDay[]>("/api/snapshots");
export const deleteSnapshot = (kind: SnapshotKind, date: string) =>
  api<void>(`/api/snapshots/${kind}/${date}`, { method: "DELETE" });
export const getOverview = (date?: string | null) => api<Overview>(`/api/overview${query({ date })}`);
export const getSummary = (dataset: Dataset, date?: string | null) =>
  api<Summary>(`/api/summary${query({ dataset, date })}`);
export const getItems = (dataset: Dataset, date?: string | null) => api<ItemsOut>(`/api/items${query({ dataset, date })}`);
export const getMonths = () => api<string[]>("/api/months");
export const getTrend = (dataset: Dataset, month?: string | null) => api<Trend>(`/api/trend${query({ dataset, month })}`);

/** Upload the day's PR and/or QR export. `date` (YYYY-MM-DD) overrides the date in the filename. */
export function uploadExports(files: { pr?: File | null; qr?: File | null }, date?: string) {
  const tooBig = [files.pr, files.qr].find((f) => f && f.size > MAX_UPLOAD_MB * 1024 * 1024);
  if (tooBig) return Promise.reject(new ApiError(`${tooBig.name} is larger than ${MAX_UPLOAD_MB} MB`, 400));
  const form = new FormData();
  if (files.pr) form.set("pr_file", files.pr);
  if (files.qr) form.set("qr_file", files.qr);
  if (date) form.set("snapshot_date", date);
  return api<UploadResponse>("/api/uploads", { method: "POST", body: form });
}
