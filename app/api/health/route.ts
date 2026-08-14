export const runtime = "nodejs";

export function GET() {
  const renderBackend =
    process.env.RENDER_BACKEND === "disabled" ||
    (process.env.VERCEL === "1" && process.env.RENDER_BACKEND !== "local")
      ? "disabled"
      : "local";

  // This endpoint exposes capabilities, never credential values. It gives a
  // host or uptime check one stable place to verify deployment configuration.
  return Response.json({
    status: "ok",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    capabilities: {
      preview: true,
      localAudioAnalysis: true,
      backgroundGeneration:
        Boolean(process.env.OPENAI_API_KEY) ||
        Boolean(
          process.env.CLOUDFLARE_ACCOUNT_ID &&
            process.env.CLOUDFLARE_API_TOKEN
        ),
      transcription:
        Boolean(process.env.OPENAI_API_KEY) ||
        Boolean(
          process.env.CLOUDFLARE_ACCOUNT_ID &&
            process.env.CLOUDFLARE_API_TOKEN
        ),
      mp4RenderBackend: renderBackend,
    },
  });
}
