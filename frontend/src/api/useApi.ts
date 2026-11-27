import { useEffect, useState } from "react";
import { errorText } from "./client";

/** Load data for a page and reload whenever `deps` change. Stale responses are ignored. */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    load()
      .then((result) => alive && setData(result))
      .catch((err) => alive && setError(errorText(err)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading: data === null && !error };
}
