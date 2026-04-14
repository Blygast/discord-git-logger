import { Client, TextChannel, Embed } from "discord.js";

let lastPushId = 0;

export function getLastPushId(): number {
  return lastPushId;
}

export function saveLastPushId(pushId: number): void {
  if (pushId > lastPushId) {
    lastPushId = pushId;
  }
}

export async function recoverLastPushIdFromDiscord(
  client: Client,
  channelId: string
): Promise<number> {
  console.log("Recovering last push ID from Discord message history...");

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      console.warn("Cannot read channel for recovery");
      return 0;
    }

    let highestPushId = 0;
    let fetched = 0;
    const maxMessages = 100;
    let lastMessageId: string | undefined;

    while (fetched < maxMessages) {
      const messages = await channel.messages.fetch({
        limit: 50,
        before: lastMessageId,
      });

      if (messages.size === 0) break;

      for (const [, msg] of messages) {
        const pushId = extractPushIdFromMessage(msg);
        if (pushId > highestPushId) {
          highestPushId = pushId;
        }
      }

      fetched += messages.size;
      lastMessageId = messages.last()?.id;
    }

    if (highestPushId > 0) {
      console.log(`Recovered: last push ID is #${highestPushId} (from ${fetched} messages scanned)`);
    } else {
      console.log("No previous push messages found in Discord");
    }

    return highestPushId;
  } catch (err) {
    console.error("Failed to recover from Discord:", err);
    return 0;
  }
}

function extractPushIdFromMessage(msg: { embeds: Embed[] }): number {
  for (const embed of msg.embeds) {
    const data = embed.data;
    if (!data) continue;

    const title = data.title || "";
    if (!title.includes("Git Push")) continue;

    const fields = data.fields || [];
    for (const field of fields) {
      const value = field.value || "";
      const match = value.match(/push #(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  return 0;
}
