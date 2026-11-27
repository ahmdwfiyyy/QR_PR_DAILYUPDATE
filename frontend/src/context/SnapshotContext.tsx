import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { errorText, getSnapshots } from "../api/client";
import type { SnapshotDay } from "../api/types";

// The days that have uploads, shared by the header's date picker and every page.
// (PO Tracker's AuthContext sits in the same place; add it alongside this when login is added.)
type SnapshotState = {
  days: SnapshotDay[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const SnapshotContext = createContext<SnapshotState | null>(null);

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<SnapshotDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(
    () =>
      getSnapshots()
        .then((list) => {
          setDays(list);
          setError("");
        })
        .catch((err) => setError(`Cannot reach the backend: ${errorText(err)}`))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <SnapshotContext.Provider value={{ days, loading, error, refresh }}>{children}</SnapshotContext.Provider>;
}

export function useSnapshots() {
  const ctx = useContext(SnapshotContext);
  if (!ctx) throw new Error("useSnapshots must be used inside SnapshotProvider");
  return ctx;
}

/** The selected day: `?date=` in the URL (so a view can be bookmarked), else the latest upload. */
export function useSelectedDate(): [string | null, (date: string) => void] {
  const { days } = useSnapshots();
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("date");
  const date = fromUrl && days.some((d) => d.date === fromUrl) ? fromUrl : (days[0]?.date ?? null);
  const setDate = (next: string) => {
    const updated = new URLSearchParams(params);
    if (next === days[0]?.date) updated.delete("date");
    else updated.set("date", next);
    setParams(updated, { replace: true });
  };
  return [date, setDate];
}
