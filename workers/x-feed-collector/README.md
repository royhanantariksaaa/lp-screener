# LP Screener X collector

This runner is mirrored into the public `lp-screener` repository so its scheduled GitHub Actions job uses the free public-repository allowance. The source and handle list are public; `TWS_COOKIES`, `PUBLISH_TOKEN`, and `PUBLISH_URL` remain encrypted repository secrets.

This private worker collects a bounded set of tracked X profiles and publishes the existing `xfeed` JSON contract used by KOL Radar. The public app receives only normalized post evidence through an authenticated Vercel endpoint; the X session cookie and `twscrape` account database stay inside the worker environment.

The scheduled GitHub Actions job runs every 15 minutes. It rotates through the configured handle list using `GITHUB_RUN_NUMBER`, so a large FOMO cohort is sampled over successive runs instead of hammering every profile in one request.

The workflow uses twscrape's optional `curl-cffi` HTTP backend because recent X deployments can return Cloudflare errors to the default HTTP client. This improves compatibility but cannot guarantee that X will accept an authenticated scraper session.

## One-time setup

Add these GitHub Actions secrets in the private repository:

- `TWS_COOKIES`: the cookie string for an account you control, containing `auth_token` and `ct0`.
- `PUBLISH_URL`: `https://lp-screener-ivory.vercel.app/api/x-feed-publish`.
- `PUBLISH_TOKEN`: the same random secret configured as `X_FEED_PUBLISH_TOKEN` in Vercel.

The Vercel project also needs a private Blob store connected to the project, which provides `BLOB_READ_WRITE_TOKEN`. The snapshot publish and read routes use that store. Set `X_FEED_SNAPSHOT_TOKEN` to the same publish secret; the server derives the snapshot URL from `VERCEL_URL` unless `X_FEED_SNAPSHOT_URL` is explicitly set.

## Local run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:TWS_COOKIES = 'auth_token=...; ct0=...'
$env:PUBLISH_URL = 'https://lp-screener-ivory.vercel.app/api/x-feed-publish'
$env:PUBLISH_TOKEN = '...'
python collector.py
```

The worker never writes cookies to the snapshot. The snapshot contains post IDs, URLs, text excerpts, timestamps, engagement, reply status, and extracted contract/ticker candidates in the same shape as `/api/market?kind=xfeed`.

Use only accounts and collection methods you are authorized to use. This worker intentionally uses one configured account and no proxy or account-rotation bypass.
