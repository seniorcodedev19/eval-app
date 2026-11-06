"use client";

import { useMemo, useState } from "react";

/* A training site's logo, used as its avatar wherever the site is listed.

   Sources are tried in order: the icon the fetch found in the page's <head>,
   then that origin's /favicon.ico, then a monogram. The second step matters
   for sites added before the fetch feature existed, and for any site whose
   page didn't declare an icon — they still get a real logo from their URL
   rather than a letter.

   These are third-party hosts, so an icon can 404 or be blocked; each
   failure falls through to the next source instead of leaving a broken
   image. */
export default function SiteLogo({
  name,
  iconUrl,
  siteUrl,
  size = 32,
}: {
  name: string;
  iconUrl?: string | null;
  /** The site's own URL, used to derive a favicon when no icon is stored. */
  siteUrl?: string | null;
  size?: number;
}) {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (iconUrl) list.push(iconUrl);
    if (siteUrl) {
      try {
        const origin = new URL(siteUrl).origin;
        const fallback = `${origin}/favicon.ico`;
        if (!list.includes(fallback)) list.push(fallback);
      } catch {
        // A malformed stored URL just means one fewer source to try.
      }
    }
    return list;
  }, [iconUrl, siteUrl]);

  const [at, setAt] = useState(0);
  const src = sources[at];
  const letter = (name.trim()[0] ?? "?").toUpperCase();

  if (!src) {
    return (
      <span className="sitelogo sitelogo-fallback" style={{ width: size, height: size }} aria-hidden="true">
        <span style={{ fontSize: Math.round(size * 0.44) }}>{letter}</span>
      </span>
    );
  }

  return (
    <span className="sitelogo" style={{ width: size, height: size }}>
      {/* A plain <img>: these are arbitrary third-party hosts, and adding each
          one to next.config's image domains isn't practical. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Keyed by source so a failed load is replaced rather than retried.
        key={src}
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setAt((i) => i + 1)}
      />
    </span>
  );
}
