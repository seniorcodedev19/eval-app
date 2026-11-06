import { redirect } from "next/navigation";
import AdminAgentConnect from "@/components/AdminAgentConnect";
import { apiFetch, tryFetch } from "@/lib/api";
import type { SlackInstallStatus, User } from "@/lib/types";

const empty: SlackInstallStatus = {
  installed: false,
  slack_oauth: false,
  client_id: "",
  has_secret: false,
  has_signing_secret: false,
  has_app_token: false,
  openai_configured: false,
  workspaces: [],
  redirect_uri: "",
  events_url: "",
};

export default async function AdminAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string; slack_error?: string }>;
}) {
  const me = await apiFetch<User>("/me");
  if (me.role !== "admin") redirect("/dashboard");
  const sp = await searchParams;
  const res = await tryFetch<SlackInstallStatus>("/agent/slack/install");
  const status = res.ok ? { ...empty, ...res.data } : empty;

  return (
    <>
      <h1>Agent connect</h1>
      <p className="sub">Install Huddle on Slack and save an OpenAI key. Members only chat — they do not add keys or tokens.</p>
      {!res.ok ? <div className="banner error">{res.error}</div> : null}
      {sp.slack === "connected" ? <div className="banner note">Huddle is connected to the Slack workspace.</div> : null}
      {sp.slack === "error" ? <div className="banner error">{sp.slack_error || "Slack install failed"}</div> : null}
      <AdminAgentConnect status={status} />
    </>
  );
}
