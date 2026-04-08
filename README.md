# Discord Git Logger

A Discord bot that receives Azure DevOps webhook events and posts detailed push notifications (with `@everyone` ping) to a specified channel.

## Features

- **@everyone ping** on every push
- **Branch tracking** — detects new branches vs. updates to existing branches
- **Detailed commit info** — shows commit hash, message, and author
- **Rich embeds** — color-coded (green = new branch, blue = update, purple = mixed)
- **Health check** — `GET /health` endpoint

## Prerequisites

- Node.js 18+
- A Discord bot token ([create one here](https://discord.com/developers/applications))
- Azure DevOps project with Service Hooks enabled

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → give it a name
3. Go to **Bot** → Copy the **token** (this is your `DISCORD_TOKEN`)
4. Enable **Message Content Intent** (not strictly needed, but good practice)
5. Go to **OAuth2 → URL Generator**
6. Select scopes: `bot`
7. Select permissions: **Send Messages**, **Embed Links**, **Mention @everyone, @here, and All Roles**
8. Copy the generated URL, open it in your browser, and invite the bot to your server
9. Right-click the target channel → Copy ID (this is your `CHANNEL_ID`)
   - If you don't see "Copy ID", enable Developer Mode in Discord settings

### 2. Configure Azure DevOps Service Hook

1. Go to your Azure DevOps project: **Project Settings → Service hooks**
2. Click **Create subscription**
3. Select **Web Hooks** → Next
4. Trigger: **Code pushed** (`git.push`)
   - Repository: Select your repo (or "All repositories")
   - Click Next
5. Action:
   - **URL**: `https://your-app.onrailway.app/webhook/azure-devops` (after deploying)
   - **Resource details to send**: **All**
   - Click **Finish**
6. After deploying, click **Test** to verify it works

### 3. Run Locally

```bash
cp .env.example .env
# Edit .env with your DISCORD_TOKEN and CHANNEL_ID

npm install
npm run dev
```

### 4. Deploy (Railway)

1. Push this repo to GitHub
2. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables:
   - `DISCORD_TOKEN` = your bot token
   - `CHANNEL_ID` = your channel ID
5. Railway auto-detects `PORT` — no need to set it manually
6. Once deployed, copy your Railway URL (e.g. `https://sportson-git-logger.up.railway.app`)
7. Go back to Azure DevOps Service Hooks and set the URL to:
   ```
   https://sportson-git-logger.up.railway.app/webhook/azure-devops
   ```

## Environment Variables

| Variable       | Required | Description                        |
|----------------|----------|------------------------------------|
| `DISCORD_TOKEN`| Yes      | Discord bot token                  |
| `CHANNEL_ID`   | Yes      | Discord channel ID to post in      |
| `PORT`         | No       | Server port (default: 3000)        |

## Endpoints

| Method | Path                      | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/health`                 | Health check (bot status)      |
| POST   | `/webhook/azure-devops`   | Azure DevOps webhook receiver  |

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
