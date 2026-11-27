import { useState } from "react";
import type { FormEvent } from "react";
import { UPLOAD_ACCEPT, deleteSnapshot, errorText, uploadExports } from "../api/client";
import { dateFromFilename, fmtDate, fmtDateTime } from "../api/format";
import type { SnapshotInfo, SnapshotKind } from "../api/types";
import { Banner, Card, Field, Spinner, TrashIcon, UploadIcon, button, inputCls, redBtn, tableHead, td, th } from "../components/ui";
import type { Notice } from "../components/ui";
import { useSnapshots } from "../context/SnapshotContext";

function FileDrop({ label, hint, file, onFile }: { label: string; hint: string; file: File | null; onFile: (f: File | null) => void }) {
  const [over, setOver] = useState(false);
  const detected = dateFromFilename(file?.name);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFile(e.dataTransfer.files[0] ?? null);
      }}
      className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
        file
          ? "border-emerald-300 bg-emerald-50/60"
          : over
            ? "border-brand-blue bg-brand-ice"
            : "border-blue-200 bg-brand-ice/40 hover:border-brand-blue"
      }`}
    >
      <input type="file" accept={UPLOAD_ACCEPT} onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="absolute inset-0 cursor-pointer opacity-0" />
      <UploadIcon className={`h-7 w-7 ${file ? "text-emerald-600" : "text-brand-blue"}`} />
      <p className="font-extrabold text-brand-navy">{label}</p>
      {file ? (
        <p className="text-sm text-slate-700">
          {file.name}
          <span className="mt-1 block text-xs text-slate-500">
            {detected ? `Date: ${fmtDate(detected)}` : "No date found in the filename. Set it below."}
          </span>
        </p>
      ) : (
        <p className="text-sm text-slate-500">
          Drop the file here or click to choose
          <span className="mt-1 block text-xs text-slate-400">{hint}</span>
        </p>
      )}
    </label>
  );
}

function Count({ info, kind }: { info: SnapshotInfo | null; kind: "PR" | "BU" | "BV" }) {
  if (!info) return <span className="text-slate-300">missing</span>;
  return <span className="tabular-nums">{info.counts[kind] ?? 0}</span>;
}

export default function UploadPage() {
  const { days, refresh } = useSnapshots();
  const [prFile, setPrFile] = useState<File | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [overrideDate, setOverrideDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [formKey, setFormKey] = useState(0); // remounts the file inputs to clear them

  const existing = new Set(days.map((d) => d.date));
  const targets = [prFile, qrFile].filter((f): f is File => f !== null).map((f) => overrideDate || dateFromFilename(f.name));
  const willReplace = targets.some((d) => d && existing.has(d));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { results } = await uploadExports({ pr: prFile, qr: qrFile }, overrideDate || undefined);
      const lines = results.map(
        (r) =>
          `${r.kind} ${fmtDate(r.date)}: ${Object.entries(r.counts)
            .map(([k, v]) => `${v} ${k}`)
            .join(", ")}${r.replaced ? " (replaced the earlier upload)" : ""}`,
      );
      setNotice({ type: "success", text: `Uploaded. ${lines.join(" · ")}` });
      setPrFile(null);
      setQrFile(null);
      setOverrideDate("");
      setFormKey((k) => k + 1);
      await refresh();
    } catch (err) {
      setNotice({ type: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: SnapshotKind, date: string) {
    if (!window.confirm(`Delete the ${kind} upload for ${fmtDate(date)}?`)) return;
    try {
      await deleteSnapshot(kind, date);
      setNotice({ type: "success", text: `Deleted the ${kind} upload for ${fmtDate(date)}.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", text: errorText(err) });
    }
  }

  return (
    <div className="space-y-6">
      <Card eyebrow="Daily upload" title="Upload today's files" description="The summary sheets don't need refreshing first: the app works them out from the raw data.">
        <form key={formKey} onSubmit={submit} className="space-y-5">
          <Banner notice={notice} />
          <div className="grid gap-5 md:grid-cols-2">
            <FileDrop label="PR file" hint="ERP PR List by Buyer (DDMMYY).xlsx" file={prFile} onFile={setPrFile} />
            <FileDrop label="QR file" hint="ERP QR List by Buyer (DDMMYY).xlsx" file={qrFile} onFile={setQrFile} />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-64">
              <Field label="Date (optional)" hint="Overrides the date in the filename">
                <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <button type="submit" className={redBtn} disabled={busy || (!prFile && !qrFile)}>
              {busy ? <Spinner /> : <UploadIcon className="h-5 w-5" />}
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
          {willReplace && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Data already exists for this date. Uploading will replace it.
            </div>
          )}
        </form>
      </Card>

      <Card title={`Upload history (${days.length} ${days.length === 1 ? "day" : "days"})`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={`${th} text-left`}>Date</th>
                <th className={`${th} text-right`}>PR</th>
                <th className={`${th} text-right`}>QR Buyer Update</th>
                <th className={`${th} text-right`}>QR Buyer Verify</th>
                <th className={`${th} text-left`}>Uploaded</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {days.map((d) => (
                <tr key={d.date} className="hover:bg-brand-ice/50">
                  <td className={`${td} whitespace-nowrap font-bold text-slate-800`}>{fmtDate(d.date, { weekday: "short" })}</td>
                  <td className={`${td} text-right`}><Count info={d.PR} kind="PR" /></td>
                  <td className={`${td} text-right`}><Count info={d.QR} kind="BU" /></td>
                  <td className={`${td} text-right`}><Count info={d.QR} kind="BV" /></td>
                  <td className={`${td} whitespace-nowrap text-xs text-slate-500`}>
                    {fmtDateTime((d.PR ?? d.QR)!.uploaded_at)}
                  </td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <div className="flex justify-end gap-2">
                      {(["PR", "QR"] as const).map(
                        (kind) =>
                          d[kind] && (
                            <button key={kind} type="button" className={button("danger", "sm")} onClick={() => remove(kind, d.date)}>
                              <TrashIcon className="h-3.5 w-3.5" /> {kind}
                            </button>
                          ),
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {days.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Nothing uploaded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
