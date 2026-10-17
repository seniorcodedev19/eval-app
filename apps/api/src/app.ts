import cors from "cors";
import express from "express";
import { authenticate } from "./auth";
import { admin } from "./routes/admin";
import { data } from "./routes/data";
import { errorHandler } from "./util";

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(authenticate);
app.use(data);
app.use(admin);
app.use(errorHandler);

export default app;
