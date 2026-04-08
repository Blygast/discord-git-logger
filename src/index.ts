import dotenv from "dotenv";
dotenv.config();

import { login, client } from "./bot";
import { createServer } from "./server";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PORT = process.env.PORT || 3000;

if (!DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is required in .env");
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error("CHANNEL_ID is required in .env");
  process.exit(1);
}

const app = createServer(CHANNEL_ID);

Promise.all([login(DISCORD_TOKEN)]).then(() => {
  app.listen(PORT, () => {
    console.log(`Webhook server listening on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook/azure-devops`);
  });
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  client.destroy();
  process.exit(0);
});
