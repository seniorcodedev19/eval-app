import AgentChat from "@/components/AgentChat";

export default function AgentPage() {
  return (
    <div className="agent-page">
      <div className="head">
        <div>
          <h1>Agent</h1>
          <p className="sub" style={{ margin: 0 }}>
            Chat about your week. Slack is connected by an admin; you do not need an API key or token.
          </p>
        </div>
      </div>
      <AgentChat />
    </div>
  );
}
