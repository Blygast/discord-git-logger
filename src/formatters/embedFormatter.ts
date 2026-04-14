import { EmbedBuilder } from "discord.js";
import { ParsedPush, BranchInfo, CommitInfo } from "../handlers/pushHandler";

export interface PushData {
  pushedBy: string;
  repositoryName: string;
  repositoryUrl: string;
  projectName: string;
  pushId: number;
  pushDate: string;
  pushUrl: string;
  branches: { name: string; isNew: boolean }[];
  commits: { id: string; shortId: string; message: string; author: string; date: string; url: string }[];
}

const COLORS = {
  newBranch: 0x2ecc71,
  updated: 0x3498db,
  mixed: 0x9b59b6,
} as const;

const MAX_COMMITS_SHOWN = 10;

function formatBranches(branches: { name: string; isNew: boolean }[]): string {
  if (branches.length === 0) return "None";

  return branches
    .map((b) => {
      const label = b.isNew ? "🆕 NEW" : "✏️ UPDATED";
      return `• **${b.name}** — ${label}`;
    })
    .join("\n");
}

function formatCommits(commits: { id: string; shortId: string; message: string; author: string; date: string; url: string }[]): string {
  if (commits.length === 0) return "No commits";

  const shown = commits.slice(0, MAX_COMMITS_SHOWN);
  const lines = shown.map(
    (c) => `• [\`${c.shortId}\`](${c.url}) — ${c.message} *(${c.author})*`
  );

  if (commits.length > MAX_COMMITS_SHOWN) {
    lines.push(`*...and ${commits.length - MAX_COMMITS_SHOWN} more commits*`);
  }

  return lines.join("\n");
}

function pickColor(branches: { name: string; isNew: boolean }[]): number {
  const hasNew = branches.some((b) => b.isNew);
  const hasUpdated = branches.some((b) => !b.isNew);

  if (hasNew && hasUpdated) return COLORS.mixed;
  if (hasNew) return COLORS.newBranch;
  return COLORS.updated;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toUTCString();
}

export function buildEmbed(push: PushData): EmbedBuilder {
  const totalCommits = push.commits.length;
  const color = pickColor(push.branches);

  const branchSummary = push.branches
    .map((b) => {
      const label = b.isNew ? "NEW" : "updated";
      return `${b.name} (${label})`;
    })
    .join(", ");

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🔀 Git Push — ${push.repositoryName}`)
    .setURL(push.repositoryUrl)
    .setDescription(
      `👤 **${push.pushedBy}** pushed **${totalCommits} commit${totalCommits !== 1 ? "s" : ""}** to **${branchSummary}**`
    )
    .setTimestamp(new Date(push.pushDate))
    .addFields(
      {
        name: "🌿 Branches",
        value: formatBranches(push.branches),
        inline: true,
      },
      {
        name: "📝 Commits",
        value: formatCommits(push.commits),
        inline: false,
      },
      {
        name: "📅 Pushed",
        value: formatDate(push.pushDate),
        inline: true,
      },
      {
        name: "🔗 Azure DevOps",
        value: `[View push #${push.pushId}](${push.pushUrl})`,
        inline: true,
      }
    )
    .setFooter({
      text: `Azure DevOps • ${push.projectName}`,
      iconURL: "https://cdn-icons-png.flaticon.com/512/2522/2522315.png",
    });
}

export function buildPushMessage(push: PushData, isCatchUp = false): {
  content: string;
  embeds: EmbedBuilder[];
} {
  const hasNew = push.branches.some((b) => b.isNew);

  let content = "@everyone";

  if (isCatchUp) {
    content = "@everyone — :warning: **Missed while offline**";
  }

  if (hasNew) {
    const newBranches = push.branches
      .filter((b) => b.isNew)
      .map((b) => `\`${b.name}\``)
      .join(", ");
    content += ` — **New branch${push.branches.filter((b) => b.isNew).length > 1 ? "es" : ""} created: ${newBranches}**`;
  }

  return {
    content,
    embeds: [buildEmbed(push)],
  };
}
