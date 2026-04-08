import express, { Request, Response } from "express";
import { parsePushPayload } from "./handlers/pushHandler";
import { buildPushMessage } from "./formatters/embedFormatter";
import { botIsReady, sendEmbed } from "./bot";

export function createServer(channelId: string) {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      botReady: botIsReady(),
    });
  });

  app.post("/webhook/azure-devops", async (req: Request, res: Response) => {
    const payload = req.body;

    if (!payload || !payload.eventType) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    if (payload.eventType !== "git.push") {
      console.log(`Ignoring event: ${payload.eventType}`);
      res.status(200).json({ message: "Event ignored" });
      return;
    }

    const parsed = parsePushPayload(payload);
    if (!parsed) {
      res.status(400).json({ error: "Failed to parse push payload" });
      return;
    }

    if (parsed.branches.length === 0) {
      console.log("Push has no branch updates (possibly a delete), skipping");
      res.status(200).json({ message: "No branch updates" });
      return;
    }

    console.log(
      `Received push #${parsed.pushId} to ${parsed.repositoryName} by ${parsed.pushedBy} — ${parsed.branches.length} branch(es), ${parsed.commits.length} commit(s)`
    );

    const { content, embeds } = buildPushMessage(parsed);

    try {
      await sendEmbed(channelId, content, embeds);
      console.log(`Push #${parsed.pushId} notification sent to Discord`);
    } catch (err) {
      console.error("Failed to send Discord message:", err);
    }

    res.status(200).json({ message: "OK" });
  });

  return app;
}
