/* Minimal CSV reading and writing, for the training-sites export/import.
   Handles quoted fields, embedded commas, doubled quotes and CRLF, which is
   what a spreadsheet produces. */

export const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const csvLine = (cells: unknown[]) => cells.map(csvCell).join(",");

/* Split CSV text into rows of strings. Returns [] for empty input. */
export function parseCsv(text: string): string[][] {
  // A spreadsheet may prefix a UTF-8 BOM; it would otherwise end up inside
  // the first header name and stop it matching.
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'; // An escaped quote inside a quoted field.
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += c;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }

  // Whatever is left after the last line break, unless the file ended cleanly.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/* Read a CSV with a header line into objects keyed by lowercased header name. */
export function parseCsvObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((hd, i) => {
      o[hd] = (r[i] ?? "").trim();
    });
    return o;
  });
}
