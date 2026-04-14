import dotenv from "dotenv";
dotenv.config();

import { login, client } from "./bot";
import { createServer } from "./server";
import { fetchMissedPushes } from "./services/azureDevOps";
import { getLastPushId, saveLastPushId } from "./storage/pushLog";
import { buildPushMessage } from "./formatters/embedFormatter";
import { sendEmbed } from "./bot";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
const CHANNEL_ID = process.env.CHANNEL_ID || "";
const PORT = process.env.PORT || 3000;

const AZURE_ORG = process.env.AZURE_ORG;
const AZURE_PROJECT = process.env.AZURE_PROJECT;
const AZURE_REPO = process.env.AZURE_REPO;
const AZURE_PAT = process.env.AZURE_PAT;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error("DISCORD_TOKEN and CHANNEL_ID are required in .env");
  process.exit(1);
}

function azureConfigured(): boolean {
  return !!(AZURE_ORG && AZURE_PROJECT && AZURE_REPO && AZURE_PAT);
}

async function catchUpMissedPushes(): Promise<void> {
  if (!azureConfigured()) {
    console.log("Azure DevOps API not configured, skipping catch-up");
    return;
  }

  const lastPushId = getLastPushId();

  if (lastPushId === 0) {
    console.log("No previous push recorded, skipping catch-up (first run)");
    return;
  }

  try {
    const missed = await fetchMissedPushes(
      AZURE_ORG!,
      AZURE_PROJECT!,
      AZURE_REPO!,
      AZURE_PAT!,
      lastPushId
    );

    if (missed.length === 0) {
      console.log("No missed pushes found");
      return;
    }

    console.log(`Found ${missed.length} missed push(es), sending notifications...`);

    for (const push of missed) {
      const { content, embeds } = buildPushMessage(push, true);

      try {
        await sendEmbed(CHANNEL_ID, content, embeds);
        console.log(`  Missed push #${push.pushId} sent`);
      } catch (err) {
        console.error(`  Failed to send missed push #${push.pushId}:`, err);
      }

      saveLastPushId(push.pushId);

      if (push !== missed[missed.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    console.log(`Catch-up complete (${missed.length} push(es))`);
  } catch (err) {
    console.error("Catch-up failed:", err);
  }
}

const app = createServer(CHANNEL_ID);

Promise.all([login(DISCORD_TOKEN)]).then(async () => {
  app.listen(PORT, () => {
    console.log(`Webhook server listening on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook/azure-devops`);
  });

  await catchUpMissedPushes();
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
