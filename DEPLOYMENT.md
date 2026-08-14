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
