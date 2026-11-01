import { Router } from "express";
import { handleSlackEnvelope, verifySlackSignature } from "../slackInbound";

export const slackEvents = Router();

slackEvents.post("/agent/slack/events", async (req, res) => {
  const raw = req.rawBody ?? JSON.stringify(req.body ?? {});
  if (!(await verifySlackSignature(req.header("x-slack-request-timestamp"), req.header("x-slack-signature"), raw))) {
    return res.status(401).json({ error: "Invalid Slack signature" });
  }
  const body = req.body as { type?: string; challenge?: string };
  if (body.type === "url_verification") return res.json({ challenge: body.challenge });
  res.json({ ok: true });
  void handleSlackEnvelope(req.body).catch((err) => console.error("Slack event failed", err));
});
