import { fmtDate } from "../api/format";
import { useSelectedDate, useSnapshots } from "../context/SnapshotContext";

/** Which uploaded day the dashboard and lists show. Sits in the navy header. */
export default function SnapshotPicker() {
  const { days } = useSnapshots();
  const [date, setDate] = useSelectedDate();
  return (
    <label className="flex items-center gap-2.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-blue-100">Snapshot</span>
      <span className="relative">
        <select
          value={date ?? ""}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 appearance-none rounded-full bg-white/10 pl-4 pr-10 text-sm font-bold text-white outline-none ring-1 ring-white/20 transition hover:bg-white/20 [&>option]:text-slate-900"
        >
          {days.map((d) => (
            <option key={d.date} value={d.date}>
              {fmtDate(d.date, { weekday: "short" })}
              {!d.PR ? " (QR only)" : !d.QR ? " (PR only)" : ""}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-100" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.3 7.7a1 1 0 0 1 1.4 0l3.3 3.3 3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" clipRule="evenodd" />
        </svg>
      </span>
    </label>
  );
}
