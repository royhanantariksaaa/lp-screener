# Local TypeScript X feed worker

This worker runs on the Windows machine that owns the authorized X API credentials. It rotates through the captured FOMO handle list, queries the official X API v2 recent-search endpoint, normalizes posts into the existing `xfeed` schema, and publishes the snapshot to the existing Vercel gateway.

It is deliberately local. No X bearer token or Vercel publish token belongs in GitHub, the public app repository, or the browser. The worker writes its cursor and last local snapshot under `data/`, which is ignored by Git.

## Setup

1. Install Node.js 20 or newer.
2. In this directory run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `X_BEARER_TOKEN` to an official X API v2 bearer token with recent-search access. Set `PUBLISH_TOKEN` to the same secret configured as Vercel's `X_FEED_PUBLISH_TOKEN`.
5. Run `npm run build` and then `npm run run-once` to verify the credentials and publish path.
6. Register the 15-minute Windows Task Scheduler job from an elevated PowerShell prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\register-task.ps1
```

The task runs as the current Windows user and requires this machine to be online. To remove it, run `unregister-task.ps1`.

## Behavior and limits

Each run queries 20 handles by default, in batches of 10, and advances `data/cursor.json` only after a successful publish. Empty results preserve the previous Vercel snapshot unless `X_ALLOW_EMPTY_PUBLISH=1`. `X_DRY_RUN=1` writes a local snapshot without publishing.

For local testing, set `X_API_BASE_URL` to a mock HTTP server. It defaults to `https://api.x.com` and should be left unchanged for production.

The worker uses the official X API v2. It does not bypass X credits, account locks, or rate limits, and it does not clone private web GraphQL calls. If X returns `credits depleted`, the run fails without overwriting the Vercel snapshot; the Task Scheduler history and the console log show the failure for later recovery.
