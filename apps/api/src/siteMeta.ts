import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { HttpError } from "./util";

export type SiteMeta = { name: string; summary: string; icon_url: string; url: string };

const MAX_BYTES = 512 * 1024; // Enough for any <head>; stop before a huge page.
const TIMEOUT_MS = 8000;

/* Private, loopback, link-local and other reserved ranges. Fetching a
   user-supplied URL from the server would otherwise let anyone use this
   endpoint to probe the network the API sits in (SSRF). */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    // IPv4 written inside an IPv6 address, e.g. ::ffff:127.0.0.1
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (v6 === "::1" || v6 === "::") return true;
    if (v6.startsWith("fe80")) return true; // link-local
    const head = parseInt(v6.split(":")[0] || "0", 16);
    if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    return false;
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  // A bare IP in the URL never reaches DNS, so check it directly.
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new HttpError(400, "That address isn't reachable from here.");
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(hostname, { all: true });
  } catch {
    throw new HttpError(400, `Couldn't find a site at ${hostname}.`);
  }
  if (addrs.some((a) => isPrivateAddress(a.address))) {
    throw new HttpError(400, "That address isn't reachable from here.");
  }
}

function decode(s: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    "#39": "'",
    nbsp: " ",
  };
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+|#39);/gi, (m, n) => named[String(n).toLowerCase()] ?? m);
}

/* Pull one attribute out of a <meta>/<link> tag, in either attribute order. */
function tagAttr(html: string, matcher: RegExp, attr: string): string {
  for (const m of html.matchAll(matcher)) {
    const tag = m[0];
    const got = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (got?.[1]?.trim()) return decode(got[1].trim());
  }
  return "";
}

function meta(html: string, prop: string): string {
  const pattern = new RegExp(
    `<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${prop}["'][^>]*>`,
    "gi",
  );
  return tagAttr(html, pattern, "content");
}

/* Read a URL's HTML and pull the site's name, description and icon out of it. */
export async function fetchSiteMeta(raw: string): Promise<SiteMeta> {
  let target: URL;
  try {
    target = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    throw new HttpError(400, "That doesn't look like a URL.");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new HttpError(400, "Only http and https URLs can be fetched.");
  }
  await assertPublicHost(target.hostname);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(target, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        // Identify this client plainly; never send the user's own details.
        "User-Agent": "TeamHuddle/1.0 (+site preview)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      throw new HttpError(504, "That site took too long to respond.");
    }
    throw new HttpError(400, `Couldn't reach ${target.hostname}.`);
  }

  try {
    if (!res.ok) throw new HttpError(400, `${target.hostname} returned ${res.status}.`);

    // A redirect can land somewhere private, so re-check where we ended up.
    const landed = new URL(res.url || target.toString());
    await assertPublicHost(landed.hostname);

    // Read at most MAX_BYTES: the <head> is at the top, and this keeps a huge
    // or endless response from filling memory.
    let html = "";
    const reader = res.body?.getReader();
    if (reader) {
      const dec = new TextDecoder("utf-8");
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        html += dec.decode(value, { stream: true });
        if (size >= MAX_BYTES || /<\/head>/i.test(html)) {
          await reader.cancel();
          break;
        }
      }
    }

    const name =
      meta(html, "og:site_name") ||
      meta(html, "application-name") ||
      meta(html, "og:title") ||
      decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim()) ||
      landed.hostname.replace(/^www\./, "");

    const summary =
      meta(html, "og:description") ||
      meta(html, "description") ||
      meta(html, "twitter:description") ||
      "";

    const rawIcon =
      tagAttr(html, /<link\b[^>]*rel\s*=\s*["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi, "href") ||
      tagAttr(html, /<link\b[^>]*rel\s*=\s*["'][^"']*\bicon\b[^"']*["'][^>]*>/gi, "href") ||
      meta(html, "og:image");

    let icon_url = "";
    if (rawIcon) {
      try {
        const abs = new URL(rawIcon, landed);
        if (abs.protocol === "http:" || abs.protocol === "https:") icon_url = abs.toString();
      } catch {
        // A malformed icon path is not worth failing the whole fetch over.
      }
    }
    if (!icon_url) icon_url = new URL("/favicon.ico", landed).toString();

    return {
      // Trim to the column limits the route validates against.
      name: name.slice(0, 80),
      summary: summary.replace(/\s+/g, " ").trim().slice(0, 500),
      icon_url: icon_url.slice(0, 500),
      url: `${landed.origin}${landed.pathname === "/" ? "" : landed.pathname}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
