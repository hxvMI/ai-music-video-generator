# AI Music Video Generator

A browser-based creator for turning an audio track, artwork, and track details
into a reactive 1080p music video. The Remotion player is the official preview,
so the composition shown in the editor uses the same data as the exported MP4.

## Features

- Drag-and-drop audio, background, and logo uploads
- Local audio analysis for energy, onsets, drops, and reactive arrangements
- Multiple independently positioned, scaled, rotated, and colored visualizers
- Configurable titles, captions, timer, and styled progress bars
- Local background templates with optional OpenAI or Cloudflare generation
- Optional lyric transcription through OpenAI or Cloudflare Workers AI
- Manual, Random, and section-aware Auto visual modes
- Browser-saved visual presets with JSON import and export
- Local MP4 rendering through Remotion
- Studio, Graphite, and high-contrast interface themes

AI credentials are optional. Uploading audio and editing a video do not require
an API key; Auto Director also works from local audio analysis when lyrics are
not available.

## Tech Stack

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4
- Remotion Player, Bundler, and Renderer
- Web Audio API
- OpenAI Images/Audio APIs and Cloudflare Workers AI as optional providers

## Getting Started

### Requirements

- Node.js 20 or newer
- npm
- A Chromium-based browser is recommended for media preview

### Install and run

```bash
git clone https://github.com/hxvMI/ai-music-video-generator.git
cd ai-music-video-generator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If that port is occupied,
Next.js prints the alternate local URL in the terminal.

### Optional AI providers

Copy `.env.example` to `.env.local` and add only the provider credentials you
intend to use:

```env
OPENAI_API_KEY=your_api_key_here

# Optional Cloudflare server default
AI_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_workers_ai_token_here
```

Restart the development server after changing `.env.local`. Never prefix these
values with `NEXT_PUBLIC_` and never commit `.env.local`.

Creators can alternatively enter personal provider credentials in the app.
Those values live only in the current browser tab's React memory and are not
written to project storage, render manifests, saved presets, or exports.

## How It Works

1. **Audio Setup** decodes the track and creates deterministic analysis points.
2. **Track & Branding** prepares metadata and render-safe image assets.
3. **Visual Design** stores themes, layers, overlays, and reactive zones as
   serializable project configuration.
4. **Video Preview** sends that configuration to the Remotion Player.
5. **Export MP4** sends the same manifest and selected assets to the local
   render-job route, preserving preview/export parity.

The browser UI may use `File`, refs, and local storage. Remotion composition
components receive only serializable configuration and asset URLs so server
rendering does not depend on browser-only objects.

## Project Structure

```text
app/
  api/                 Server routes for AI providers and render jobs
  components/audio/    Upload, metadata, playback, and visual-design controls
  components/remotion/ Remotion composition entry points
  components/video/    Shared preview/export scene and render workflow
  hooks/               Audio analysis, generation, and preview transport state
  lib/                 Pure presets, normalization, manifests, and render helpers
  types/               Shared project and export contracts
remotion/              Remotion bundle entry point
```

## Development Commands

```bash
npm run dev      # Start the local editor
npm run lint     # Run ESLint
npm run build    # Type-check and create a production build
npm run start    # Serve the production build
```

Run both `npm run lint` and `npm run build` before opening a pull request.

## Deployment

The project is prepared for a Vercel hosted-preview deployment. The editor,
Remotion preview, local analysis, and background tools fit that model; the
current Chromium/FFmpeg MP4 worker remains local until durable uploads and a
render worker are connected. See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact
capability split and deployment steps.

## Local Data and Privacy

- Uploaded audio and images remain local unless explicitly sent to an AI route.
- Personal API credentials are intentionally excluded from persistence.
- Generated images are session-local data URLs.
- Render jobs are written to `.render-jobs/`, which is excluded from Git.
- Browser-saved projects and visual presets can be cleared through browser data.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch, testing, and pull-request
guidance. Bug reports should include browser details, reproduction steps, and
whether the issue affects preview, export, or both.

## Project Status

The editor and local MP4 workflow are functional and under active development.
Current priorities include stronger persistence, reusable project templates,
more typography controls, and YouTube packaging tools.

## License

No license has been selected yet. Until one is added, copyright remains with
the project owner and the repository should not be treated as open source.
