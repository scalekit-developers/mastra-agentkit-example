# Mastra + Scalekit AgentKit

A Mastra agent that reads Gmail using [Scalekit AgentKit](https://docs.scalekit.com/agentkit/overview/) for OAuth-managed tool access. Discovers tools dynamically from Scalekit and wraps them as native Mastra tools.

## What it does

Ask the agent to manage your Gmail. It discovers available tools from Scalekit, handles authorization, and executes tool calls on your behalf:

```
Prompt: Fetch my last 5 unread emails and summarize them.

Connected account for user_123 is active.
Discovered 8 tools: gmail_fetch_mails, gmail_send_mail, ...
Created 8 Mastra tools.

Here are your 5 most recent unread emails:

1. "Q1 roadmap feedback needed" — Sarah Chen (1h ago)
2. "Deploy failed: production" — GitHub Actions (2h ago)
3. "New PR review requested" — Lin Feng (3h ago)
...
```

## Why this repo

| Pattern | What it shows |
|---------|---------------|
| **Dynamic tool discovery** | Lists tools from Scalekit at runtime — no hardcoded tool definitions |
| **Magic link authorization** | Generates an auth URL if the user hasn't connected their account |
| **Automatic token refresh** | Scalekit manages OAuth tokens; your code never handles refresh |
| **Mastra `createTool` wrapping** | Converts Scalekit tool definitions into native Mastra tools |

## Prerequisites

- A [Scalekit account](https://app.scalekit.com) with a `gmail` connection configured under **AgentKit → Connections**
- An OpenAI API key
- Node.js 18+ and [pnpm](https://pnpm.io)

## Setup

**1. Add credentials**

```bash
cp .env.example .env
```

Fill in your credentials:

```env
SCALEKIT_ENV_URL=https://your-env.scalekit.dev
SCALEKIT_CLIENT_ID=skc_...
SCALEKIT_CLIENT_SECRET=...
OPENAI_API_KEY=sk-...
```

> Get your Scalekit credentials at [app.scalekit.com](https://app.scalekit.com) → select your environment → Settings → API Credentials

**2. Install and run**

```bash
pnpm install
pnpm start
```

On the first run, if the user hasn't authorized Gmail, you'll see an authorization link:

```
[gmail] Authorization required.
Open this link:

  https://auth.scalekit.dev/connect/...

Press Enter once you have completed the OAuth flow...
```

After authorization, the agent runs and prints its response.

**3. Custom prompts**

Pass a custom prompt as an argument:

```bash
pnpm start "Search for emails from GitHub and list the subjects"
```

## How it works

1. **Initialize Scalekit** — `ScalekitClient` authenticates with your environment credentials
2. **Ensure connected account** — Checks if the user has an active Gmail connection; generates a magic link if not
3. **Discover tools** — `scalekit.tools.listTools()` returns tool definitions (name, description, input schema) for the connected account
4. **Create Mastra tools** — Each Scalekit tool is wrapped with `createTool()` from `@mastra/core/tools`, wiring `execute` to `scalekit.tools.executeTool()`
5. **Run the agent** — A Mastra `Agent` with GPT-4o receives the tools and generates a response

## Learn more

- [AgentKit overview](https://docs.scalekit.com/agentkit/overview/) — how Scalekit manages OAuth for agents
- [AgentKit quickstart](https://docs.scalekit.com/agentkit/quickstart/) — connect your first user in minutes
- [All supported connectors](https://docs.scalekit.com/agentkit/connectors/) — Gmail, Slack, Notion, and 60+ more
- [Mastra documentation](https://mastra.ai/docs) — the Mastra framework
