"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { callJson } from "@/lib/client";
import { Spinner } from "./Icons";

type ImportResult = { created: number; updated: number; skipped: string[] };

/* Export the site list as CSV, and import one back. Import matches on `name`:
   a known name updates that site, a new one is created, and nothing is ever
   deleted — sites carry training accounts with them. */
export default function TrainingSitesCsv() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; csv: string; rows: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const pick = async (file: File | undefined) => {
    setError(null);
    setResult(null);
    if (!file) return;
    if (file.size > 300_000) {
      setError("That file is larger than 300 KB.");
      return;
    }
    const csv = await file.text();
    // Count non-blank lines as a rough row count, minus the header.
    const rows = Math.max(0, csv.split(/\r?\n/).filter((l) => l.trim() !== "").length - 1);
    if (rows === 0) {
      setError("That file has no rows below the header.");
      return;
    }
    setPending({ name: file.name, csv, rows });
  };

  const clearPending = () => {
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const apply = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const r = await callJson<ImportResult>("POST", "/training-sites/import", { csv: pending.csv });
      setResult(r);
      clearPending();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="csv-actions">
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {/* A plain link: the proxy forwards Content-Disposition, so the
            browser downloads it rather than navigating. */}
        <a className="btn secondary small" href="/api/proxy/training-sites.csv" download>
          Export CSV
        </a>
        <button
          className="btn secondary small"
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          Import CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="visually-hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>

      {/* Messages and the import confirmation drop out of the header flow, so
          a long filename or a skipped-row list can't stretch the toolbar. */}
      {(error || result || pending) && (
        <div className="csv-drop">
          {error && (
            <div className="banner error" role="alert">
              {error}
            </div>
          )}

          {result && (
            <div className="banner" role="status">
              Imported: {result.created} added, {result.updated} updated
              {result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : ""}.
              {result.skipped.length > 0 && (
                <ul className="csv-skipped">
                  {result.skipped.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {pending && (
            <div className="csv-confirm">
              <p>
                <strong>{pending.name}</strong> — {pending.rows} row
                {pending.rows === 1 ? "" : "s"}. Sites are matched by name: existing names are
                updated, new ones added. Nothing is deleted.
              </p>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn" type="button" onClick={apply} disabled={busy}>
                  {busy ? <Spinner size={14} /> : null}
                  {busy
                    ? "Importing…"
                    : `Import ${pending.rows} row${pending.rows === 1 ? "" : "s"}`}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={clearPending}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
