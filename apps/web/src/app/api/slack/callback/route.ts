import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { API_URL, signApiToken } from "@/lib/api";

async function destForSlack(req: NextRequest) {
  const dest = new URL("/agent", req.nextUrl.origin);
  const state = req.nextUrl.searchParams.get("state");
  const secret = process.env.API_JWT_SECRET;
  if (!state || !secret) return dest;
  try {
    const { payload } = await jwtVerify(state, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (payload.kind === "install") dest.pathname = "/admin/agent";
  } catch {
    /* stay on /agent */
  }
  return dest;
}

export async function GET(req: NextRequest) {
  const dest = await destForSlack(req);
  const slackErr = req.nextUrl.searchParams.get("error");
  if (slackErr) {
    dest.searchParams.set("slack", "error");
    dest.searchParams.set("slack_error", slackErr === "access_denied" ? "Slack connect was cancelled" : slackErr);
    return NextResponse.redirect(dest);
  }
  const token = await signApiToken();
  if (!token) {
    dest.pathname = "/login";
    dest.searchParams.set("error", "Sign in to connect Slack");
    return NextResponse.redirect(dest);
  }
  try {
    const res = await fetch(`${API_URL}/agent/slack/oauth/callback${req.nextUrl.search}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; kind?: string };
    if (!res.ok) {
      dest.searchParams.set("slack", "error");
      dest.searchParams.set("slack_error", body.error ?? "Slack connect failed");
      return NextResponse.redirect(dest);
    }
    if (body.kind === "user") dest.pathname = "/agent";
  } catch {
    dest.searchParams.set("slack", "error");
    dest.searchParams.set("slack_error", "Can't reach the API");
    return NextResponse.redirect(dest);
  }
  dest.searchParams.set("slack", "connected");
  return NextResponse.redirect(dest);
}
