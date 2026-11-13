import { hasAppCreditConfiguration } from "@/lib/appAiCredits";

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
      backgroundGeneration: hasAppCreditConfiguration(),
      transcription: hasAppCreditConfiguration(),
      mp4RenderBackend: renderBackend,
    },
  });
}
