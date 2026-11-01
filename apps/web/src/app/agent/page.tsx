import AgentChat from "@/components/AgentChat";
import AgentSettings from "@/components/AgentSettings";
import { tryFetch } from "@/lib/api";
import type { SlackStatus } from "@/lib/types";

const emptyStatus: SlackStatus = {
  connected: false,
  slack_user_id: null,
  slack_team_id: null,
  connected_at: null,
  openai_configured: false,
};

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string; slack_error?: string }>;
}) {
  const sp = await searchParams;
  const slack = await tryFetch<SlackStatus>("/agent/slack/status");
  const status: SlackStatus = slack.ok ? { ...emptyStatus, ...slack.data } : emptyStatus;

  return (
    <>
      <div className="head">
        <div>
          <h1>Agent</h1>
          <p className="sub" style={{ margin: 0 }}>
            Chat here about your week. Paste your Slack token in settings to search channels and post for you.
          </p>
        </div>
        <div className="head-actions">
          <AgentSettings status={status} />
        </div>
      </div>
      {!slack.ok ? <div className="banner error">{slack.error}</div> : null}
      {sp.slack === "connected" ? <div className="banner note">Slack is connected for your agent.</div> : null}
      {sp.slack === "error" ? <div className="banner error">{sp.slack_error || "Slack connect failed"}</div> : null}
      <AgentChat />
    </>
  );
}
