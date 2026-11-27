// Formatting helpers and shared labels. Timestamps come from the API in UTC and are shown in Malaysia time.
import type { Dataset } from "./types";

const TZ = "Asia/Kuala_Lumpur";

/** Date-only values (YYYY-MM-DD) are calendar dates, so they are shown as-is without timezone shifting. */
export const fmtDate = (value: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) => {
  if (!value) return "—";
  const dateOnly = value.length === 10;
  const d = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(dateOnly ? {} : { timeZone: TZ }),
    ...opts,
  });
};

export const fmtShortDate = (value: string | null | undefined) => fmtDate(value, { year: undefined });
export const fmtLongDate = (value: string | null | undefined) =>
  fmtDate(value, { weekday: "long", month: "long" });
export const fmtMonth = (month: string) => fmtDate(`${month}-01`, { day: undefined, month: "long" });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

export const money = (amount: number, currency: string | null) =>
  `${currency ?? ""} ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();

/** "(261026)" in the filename -> 2026-10-26, same rule as the backend. */
export function dateFromFilename(name: string | undefined) {
  const m = name?.match(/\((\d{2})(\d{2})(\d{2})\)/);
  return m ? `20${m[3]}-${m[2]}-${m[1]}` : null;
}

export const isWeekend = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00`).getDay());

export const DATASETS: Record<Dataset, { label: string; short: string; agingLabel: string; path: string }> = {
  PR: { label: "PR Open", short: "PR", agingLabel: "Days aging", path: "/pr" },
  BU: { label: "QR Buyer Update", short: "Buyer Update", agingLabel: "Elapsed days", path: "/qr/update" },
  BV: { label: "QR Buyer Verify", short: "Buyer Verify", agingLabel: "Elapsed days", path: "/qr/verify" },
};
export const DATASET_IDS = Object.keys(DATASETS) as Dataset[];

// Chart colours: one per dataset, then a cycle for buyers
export const DATASET_COLORS: Record<Dataset, string> = { PR: "#0b3c91", BU: "#ed2924", BV: "#1559d6" };
export const BUYER_COLORS = ["#0b3c91", "#ed2924", "#0f9d74", "#d97706", "#7c3aed", "#0891b2", "#be185d", "#64748b"];
