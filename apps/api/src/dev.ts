import app from "./app";
import { startSlackSocket } from "./slackSocket";

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  void startSlackSocket();
});
