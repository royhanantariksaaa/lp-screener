# Local TypeScript X feed worker

This worker runs on the Windows machine that owns the authorized X web session. It rotates through the captured FOMO handle list, opens X search with the `auth_token` and `ct0` cookies in a TypeScript Playwright browser session, normalizes visible posts into the existing `xfeed` schema, and publishes the snapshot to the existing Vercel gateway.

It is deliberately local. No X bearer token or Vercel publish token belongs in GitHub, the public app repository, or the browser. The worker writes its cursor and last local snapshot under `data/`, which is ignored by Git.

## Setup

1. Install Node.js 20 or newer.
2. In this directory run `npm install`.
3. Install the Playwright Chromium runtime: `npx playwright install chromium`.
4. Copy `.env.example` to `.env.local`.
5. Set `X_AUTH_TOKEN` to your X `auth_token` cookie and `X_CT0` to your X `ct0` cookie. Set `PUBLISH_TOKEN` to the same secret configured as Vercel's `X_FEED_PUBLISH_TOKEN`.
6. Run `npm run build` and then `npm run run-once` to verify the cookie session and publish path.
7. Register the 15-minute Windows Task Scheduler job from an elevated PowerShell prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\register-task.ps1
```

The task runs as the current Windows user and requires this machine to be online. To remove it, run `unregister-task.ps1`.

## Behavior and limits

Each run queries 20 handles by default, in batches of 10, and advances `data/cursor.json` only after a successful publish. Empty results preserve the previous Vercel snapshot unless `X_ALLOW_EMPTY_PUBLISH=1`. `X_DRY_RUN=1` writes a local snapshot without publishing.

For local testing, set `X_API_BASE_URL` to a mock HTTP server. It defaults to `https://api.x.com` and should be left unchanged for production.

The worker does not use the X API or consume X API credits. It uses the logged-in web session cookies and the public search UI through Playwright. X can expire or challenge those cookies; when that happens, refresh `auth_token` and `ct0` in `.env.local`. Empty results preserve the previous Vercel snapshot unless `X_ALLOW_EMPTY_PUBLISH=1`.
