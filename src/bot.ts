import { Client, GatewayIntentBits, EmbedBuilder, TextChannel } from "discord.js";

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let isReady = false;

client.once("ready", () => {
  isReady = true;
  console.log(`Logged in as ${client.user?.tag}`);
});

export async function login(token: string): Promise<void> {
  await client.login(token);
}

export function botIsReady(): boolean {
  return isReady;
}

export async function sendEmbed(
  channelId: string,
  content: string,
  embeds: EmbedBuilder[]
): Promise<void> {
  if (!isReady) {
    console.warn("Bot not ready yet, skipping message send");
    return;
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    console.error(`Channel ${channelId} not found or is not a text channel`);
    return;
  }

  await channel.send({ content, embeds });
}
