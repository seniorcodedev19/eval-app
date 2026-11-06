"use client";

import { useEffect } from "react";

// Replaces the root layout, so it cannot rely on globals.css or the theme script.
// Keep it self-contained and plain.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#f4f6fb",
          color: "#111b2e",
          fontFamily:
            '"IBM Plex Sans Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        <main style={{ maxWidth: 440, textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: "#647189", textTransform: "uppercase" }}>
            Team Huddle
          </p>
          <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 22px", color: "#647189", lineHeight: 1.55 }}>
            Team Huddle couldn&apos;t start. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              fontSize: 13.5,
              fontWeight: 550,
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid transparent",
              background: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ margin: "18px 0 0", fontSize: 12, color: "#647189" }}>Reference: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
