# Discord Git Logger

A Discord bot that receives Azure DevOps webhook events and posts detailed push notifications with `@everyone` ping to a specified channel.

## Features

- **@everyone ping** on every push
- **Branch tracking** — detects new branches vs. updates to existing branches
- **Detailed commit info** — shows commit hash, message, and author with links
- **Rich embeds** — color-coded (green = new branch, blue = update, purple = mixed)
- **Missed push recovery** — on startup, reads Discord message history to find the last posted push ID, then fetches any missed pushes from the Azure DevOps API and posts them in order
- **Duplicate prevention** — skips pushes that have already been posted
- **Health check** — `GET /health` endpoint

## Prerequisites

- Node.js 18+
- A Discord bot token ([create one here](https://discord.com/developers/applications))
- Azure DevOps project with Service Hooks enabled
- (Optional) An Azure DevOps Personal Access Token for missed push recovery

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → give it a name
3. Go to **Bot** → Copy the **token** (this is your `DISCORD_TOKEN`)
4. Go to **OAuth2 → URL Generator**
5. Select scopes: `bot`
6. Select permissions: **Send Messages**, **Embed Links**, **Mention @everyone, @here, and All Roles**
7. Copy the generated URL, open it in your browser, and invite the bot to your server
8. Right-click the target channel → Copy ID (this is your `CHANNEL_ID`)
   - If you don't see "Copy ID", enable Developer Mode in Discord settings (User Settings > Advanced)

### 2. Create an Azure DevOps Personal Access Token (for missed push recovery)

1. Go to `https://dev.azure.com/{your-org}/_usersSettings/tokens`
2. Click **Create new token**
3. Name it `discord-bot`
4. Scopes: **Code → Read**
5. Click **Create** → copy the token (this is your `AZURE_PAT`)

### 3. Deploy to Railway

1. Push this repo to GitHub
2. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub repo
3. Select the repo → Railway auto-detects Node.js and builds it
4. Go to your service → **Settings** → **Public Networking** → **Generate Domain**
5. Go to your service → **Variables** and add:

| Variable | Value |
|----------|-------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `CHANNEL_ID` | Your Discord channel ID |
| `AZURE_ORG` | Your Azure DevOps org name (e.g. `Grupp-5`) |
| `AZURE_PROJECT` | Your Azure DevOps project, URL-encoded (e.g. `Sportson%20View`) |
| `AZURE_REPO` | Your repository name (e.g. `Sportson-View`) |
| `AZURE_PAT` | Your Azure DevOps PAT |

> `PORT` is auto-assigned by Railway — don't set it manually.

### 4. Configure Azure DevOps Service Hook

1. Go to your Azure DevOps project → **Project Settings → Service hooks**
2. Click **Create subscription**
3. Select **Web Hooks** → Next
4. Trigger: **Code pushed** (`git.push`)
   - Repository: Select your repo (or "All repositories")
   - Click Next
5. Action:
   - **URL**: `https://your-railway-domain.up.railway.app/webhook/azure-devops`
   - **Resource details to send**: **All**
   - Click **Finish**
6. Click **Test** to verify the webhook works

### 5. Run Locally (optional)

```bash
cp .env.example .env
# Edit .env with your tokens and IDs

npm install
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `CHANNEL_ID` | Yes | Discord channel ID to post in |
| `AZURE_ORG` | Yes | Azure DevOps organization name |
| `AZURE_PROJECT` | Yes | Azure DevOps project name (URL-encoded, e.g. `Sportson%20View`) |
| `AZURE_REPO` | Yes | Azure DevOps repository name |
| `AZURE_PAT` | Yes | Azure DevOps Personal Access Token (Code > Read) |
| `PORT` | No | Server port (default: 3000, auto-set by Railway) |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check, returns bot ready status |
| POST | `/webhook/azure-devops` | Azure DevOps webhook receiver |

## How It Works

1. Azure DevOps sends a `git.push` webhook to `/webhook/azure-devops` on every push
2. The bot parses the payload, detects new vs updated branches, and formats a rich Discord embed
3. The embed is posted to the configured channel with `@everyone`
4. On startup, the bot scans up to 100 recent Discord messages to recover the last push ID it posted
5. It then queries the Azure DevOps API for any pushes newer than that and posts them as catch-up messages (marked with a "Missed while offline" warning)
6. Incoming webhooks are deduplicated — if a push ID has already been processed, it's skipped

## Example Output

When someone pushes to the `dev` branch:

```
@everyone — New branch created: `feature/login`

┌─────────────────────────────────────┐
│ 🔀 Git Push — Sportson-View        │
│ 👤 Jamal pushed 3 commits to       │
│    feature/login (NEW), dev (upd)  │
│                                     │
│ 🌿 Branches:        📅 Pushed:      │
│  • feature/login    Wed, 8 Apr 2026 │
│    🆕 NEW           🔗 Azure DevOps  │
│  • dev              View push #14   │
│    ✏️ UPDATED                        │
│                                     │
│ 📝 Commits:                         │
│  • abc1234 — Fixed bug    (Jamal)  │
│  • def5678 — Add login    (Jane)   │
│  • 9012345 — Style fixes  (Jane)   │
│                                     │
│ Azure DevOps • Sportson View        │
└─────────────────────────────────────┘
```
