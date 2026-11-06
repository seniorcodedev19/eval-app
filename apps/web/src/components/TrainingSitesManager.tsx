"use client";

import { useAction } from "@/lib/client";
import AddSiteInline from "./AddSiteInline";
import SiteLogo from "./SiteLogo";
import Switch from "./Switch";
import TrainingSitesCsv from "./TrainingSitesCsv";
import type { TrainingSite } from "@/lib/types";

/* Admin-managed list of AI training sites. These become the rows of the
   status matrix, so every profile is measured against the same set. */
export default function TrainingSitesManager({ sites }: { sites: TrainingSite[] }) {
  const { error, busy, run } = useAction();

  return (
    <>
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Add a training site</h2>
        <p className="sub">Paste a URL and fetch the name, summary and icon from the site.</p>
        <AddSiteInline />
      </div>

      <TrainingSitesCsv />

      {sites.length === 0 ? (
        <div className="empty">No training sites yet.</div>
      ) : (
        <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>URL</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="site-cell">
                      <SiteLogo name={s.name} iconUrl={s.icon_url} siteUrl={s.url} size={24} />
                      <span>
                        <strong>{s.name}</strong>
                        {s.summary ? <span className="site-summary-sm">{s.summary}</span> : null}
                      </span>
                    </span>
                  </td>
                  <td>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer noopener">
                        {s.url}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="switch-row">
                      <Switch
                        label={`${s.name} is active`}
                        checked={s.active}
                        disabled={busy}
                        onChange={(next) => run("PATCH", `/training-sites/${s.id}`, { active: next })}
                      />
                      <span className="muted">{s.active ? "Active" : "Hidden"}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn secondary small"
                      type="button"
                      onClick={() => run("DELETE", `/training-sites/${s.id}`)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
