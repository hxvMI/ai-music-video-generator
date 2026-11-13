# Deployment

## Recommended First Deployment

Use Vercel Hobby for a personal, non-commercial hosted editor and preview.
The repository includes `vercel.json`, which builds the Next.js app and marks
the local MP4 renderer as disabled in that serverless environment.

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Keep the detected framework set to Next.js.
4. Add optional AI provider environment variables in Vercel Project Settings.
5. Deploy and verify `/api/health` returns `"status": "ok"`.

Do not upload `.env.local` or paste secrets into `vercel.json`.

The Cloudflare account ID and Workers AI token belong in server-side environment
variables, not the personal-connection form or any `NEXT_PUBLIC_` variable, when
you want all visitors to use App default. Use `.env.local` beside `package.json`
for local development and Vercel Project Settings > Environment Variables for
the hosted app. Restart locally or redeploy after changes. Use a fresh,
least-privilege Workers AI token if a previous token was shared in chat.
The server keeps the credentials private, but the public generation routes still
spend your allowance: the D1 ledger below is required, and request limits or bot
protection should be enabled before inviting unrestricted public traffic.

Cloudflare lyric transcription uses `@cf/openai/whisper-large-v3-turbo` for timed
segments. Word timestamps, when present, are grouped into short cues without
filling instrumental gaps. Segment-only responses keep their original timing;
text-only responses retain the explicitly approximate, evenly distributed fallback.
Creators can edit cue times or shift all cues together within the track bounds.

## Cloudflare App Default Setup

1. In Cloudflare, open Workers AI, select Use REST API, and create a Workers AI
   token. Copy the account ID. Keep the account on Workers Free if you want a
   provider-enforced free daily ceiling. The app does not change your billing plan.
2. Create a D1 database named `music-video-credits`. In its SQL console, run
   [cloudflare/ai-credits.sql](cloudflare/ai-credits.sql). Copy the database ID.
3. Create a second account-scoped API token with D1 Write access for the ledger.
4. In Vercel environment variables (and locally in `.env.local`), configure:

```env
AI_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_workers_ai_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id
CLOUDFLARE_D1_API_TOKEN=your_d1_token
APP_AI_DAILY_CREDITS=100
```

5. Redeploy or restart the local server. Check `/api/ai/credits`: `ready` and
   a numeric `remaining` balance mean the server can read the ledger. Make a
   small background request to verify Workers AI access as well. A ledger check
   alone does not verify the AI token or model access.

The visible balance is a shared daily *request* allowance. One submitted image
or transcription request uses one credit, including failures after reservation.
It is not Cloudflare's actual neuron balance, and 100 requests are not guaranteed
to fit inside the free neuron allocation. The provider can stop requests sooner.
When error 3036 indicates provider exhaustion, the ledger is locked until the
next UTC day. Temporary capacity errors do not lock the pool. Each day resets
at 00:00 UTC; personal connections never spend shared credits.

The D1 conditional update reserves a credit atomically across server instances.
Missing or unreachable storage blocks App default requests rather than displaying
a fictitious balance or spending untracked requests. The public endpoint exposes
only aggregate counts, never account IDs, tokens, prompts, or user information.
The tracker refreshes each minute while visible, after requests, and on manual
refresh. Protect the deployment against automated abuse before a wide public launch.

Provider references: [Workers AI setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/),
[D1 queries](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/),
[Workers AI limits and pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

## What Works on Vercel

- Guided editor and Remotion Player preview
- Browser-local audio analysis
- Local background templates
- Saved browser projects and visual profiles
- OpenAI or Cloudflare background generation when configured
- Small API requests and the deployment health endpoint

## Current Hosted Limitations

The existing MP4 workflow is a local worker, not a serverless job. It writes
uploads, status JSON, and final MP4 files to `.render-jobs/`, starts Chromium
and FFmpeg, and expects later polling requests to reach the same filesystem.
Vercel Functions do not guarantee that persistent process/filesystem model.

Vercel Functions also cap request and response bodies at 4.5 MB. Most music
files exceed that limit, so both full-track render uploads and many audio
transcription requests need direct object-storage uploads before they can be
production-ready online.

## Path to Online MP4 Export

Two practical options remain:

### Client-side rendering

Render on the creator's computer in the browser. This keeps hosting costs low
and avoids uploading full tracks, but needs a browser capability audit,
progress/cancellation work, memory safeguards, and output compatibility tests.

### Durable cloud renderer

Upload media directly to object storage, enqueue a render job, and run Remotion
on a persistent worker or supported serverless renderer. Store job status and
the output URL in durable storage instead of a local folder.

Required pieces:

- Object storage with signed browser uploads
- Durable job records and queue
- A Chromium/FFmpeg render worker
- Download URLs with cleanup/expiration
- Per-user limits, cancellation, and abuse protection

Vercel can remain the frontend in either architecture.

## Environment Modes

Local full export:

```env
RENDER_BACKEND=local
NEXT_PUBLIC_RENDER_BACKEND=local
```

Hosted preview without a renderer:

```env
RENDER_BACKEND=disabled
NEXT_PUBLIC_RENDER_BACKEND=disabled
```

`NEXT_PUBLIC_RENDER_BACKEND` contains no secret. It only lets the interface
explain whether the export action is available before a user submits media.
