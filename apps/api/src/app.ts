import cors from "cors";
import express from "express";
import { authenticate } from "./auth";
import { core } from "./routes/core";
import { interviews } from "./routes/interviews";
import { metrics } from "./routes/metrics";
import { time } from "./routes/time";
import { week } from "./routes/week";
import { errorHandler } from "./util";

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(authenticate);
app.use(core);
app.use(metrics);
app.use(week);
app.use(time);
app.use(interviews);
app.use(errorHandler);

export default app;
