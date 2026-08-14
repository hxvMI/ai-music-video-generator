import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  RenderJobAsset,
  VideoExportManifest,
  VideoRenderJob,
  VideoRenderPlan,
} from "@/types/videoProject";

export const runtime = "nodejs";
export const maxDuration = 300;

const RENDER_JOBS_FOLDER = ".render-jobs";
const RENDER_JOB_FILE_NAME = "render-job.json";
const activeRenderJobs = new Set<string>();

function isLocalRenderBackendEnabled() {
  if (process.env.RENDER_BACKEND === "disabled") return false;
  if (process.env.RENDER_BACKEND === "local") return true;

  // Local rendering needs a persistent process and filesystem. Default Vercel
  // functions do not provide either across the POST and polling requests.
  return process.env.VERCEL !== "1";
}

function getRenderJobFolder(jobId: string) {
  return path.join(process.cwd(), RENDER_JOBS_FOLDER, jobId);
}

async function writeRenderJobFile(jobFolder: string, renderJob: VideoRenderJob) {
  const outputPath = path.join(jobFolder, RENDER_JOB_FILE_NAME);
  const temporaryPath = `${outputPath}.tmp`;

  await writeFile(temporaryPath, JSON.stringify(renderJob, null, 2));
  await rename(temporaryPath, outputPath);
}

async function readRenderJobFile(jobFolder: string) {
  const renderJobPath = path.join(jobFolder, RENDER_JOB_FILE_NAME);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return JSON.parse(await readFile(renderJobPath, "utf8")) as VideoRenderJob;
    } catch (reason) {
      lastError = reason;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  throw lastError;
}

function getTextField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${fieldName}.`);
  }

  return value;
}

function parseJsonField<T>(formData: FormData, fieldName: string) {
  return JSON.parse(getTextField(formData, fieldName)) as T;
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    value !== null &&
    typeof value !== "string" &&
    typeof value.arrayBuffer === "function" &&
    value.size > 0
  );
}

function safeFileName(fileName: string) {
  const cleanedName = fileName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-");

  return cleanedName || "asset";
}

async function saveUploadedAsset({
  file,
  role,
  jobFolder,
}: {
  file: File;
  role: RenderJobAsset["role"];
  jobFolder: string;
}): Promise<RenderJobAsset> {
  const fileName = `${role}-${safeFileName(file.name)}`;
  const outputPath = path.join(jobFolder, "assets", fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await writeFile(outputPath, fileBuffer);

  return {
    role,
    fileName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

function buildRenderAssetUrl({
  origin,
  jobId,
  role,
  uploadedAssets,
}: {
  origin: string;
  jobId: string;
  role: RenderJobAsset["role"];
  uploadedAssets: RenderJobAsset[];
}) {
  const asset = uploadedAssets.find((item) => item.role === role);

  if (!asset) return null;

  const url = new URL("/api/render-jobs", origin);
  url.searchParams.set("jobId", jobId);
  url.searchParams.set("asset", role);

  return url.toString();
}

function getSafeRenderPlanDataUrl(value: string | null) {
  if (!value?.startsWith("data:image/")) return null;

  return value;
}

function getRenderJobAsset(renderJob: VideoRenderJob, role: RenderJobAsset["role"]) {
  return renderJob.assets.find((asset) => asset.role === role) ?? null;
}

async function renderJobInBackground({
  origin,
  jobId,
  jobFolder,
  manifest,
  renderPlan,
  uploadedAssets,
  initialRenderJob,
}: {
  origin: string;
  jobId: string;
  jobFolder: string;
  manifest: VideoExportManifest;
  renderPlan: VideoRenderPlan;
  uploadedAssets: RenderJobAsset[];
  initialRenderJob: VideoRenderJob;
}) {
  if (activeRenderJobs.has(jobId)) return;

  activeRenderJobs.add(jobId);

  let renderJob = initialRenderJob;
  let lastSavedPercent = -1;
  let lastSavedStage = renderJob.progress.stage;

  const saveProgress = async (progress: VideoRenderJob["progress"]) => {
    const normalizedProgress = {
      ...progress,
      percent: Math.min(Math.max(progress.percent, 0), 1),
    };
    const shouldSave =
      normalizedProgress.stage !== lastSavedStage ||
      normalizedProgress.percent - lastSavedPercent >= 0.01 ||
      normalizedProgress.percent === 1;

    renderJob = {
      ...renderJob,
      updatedAtIso: new Date().toISOString(),
      progress: normalizedProgress,
    };

    if (!shouldSave) return;

    lastSavedPercent = normalizedProgress.percent;
    lastSavedStage = normalizedProgress.stage;
    await writeRenderJobFile(jobFolder, renderJob);
  };

  try {
    const { renderSavedVideoJob } = await import("@/lib/serverVideoRenderer");
    const renderedOutput = await renderSavedVideoJob({
      manifest,
      renderPlan,
      jobFolder,
      uploadedAssets,
      assetUrls: {
        audioUrl: buildRenderAssetUrl({
          origin,
          jobId,
          role: "audio",
          uploadedAssets,
        }),
        backgroundUrl:
          buildRenderAssetUrl({
            origin,
            jobId,
            role: "background",
            uploadedAssets,
          }) ?? getSafeRenderPlanDataUrl(renderPlan.browserAssets.backgroundUrl),
        logoUrl: buildRenderAssetUrl({
          origin,
          jobId,
          role: "logo",
          uploadedAssets,
        }),
      },
      onProgress: (progress) => {
        return saveProgress({
          stage: progress.stage,
          percent: progress.percent,
          renderedFrames: progress.renderedFrames ?? renderJob.progress.renderedFrames,
          encodedFrames: progress.encodedFrames ?? renderJob.progress.encodedFrames,
          totalFrames: renderPlan.output.durationFrames,
        });
      },
    });

    renderJob = {
      ...renderJob,
      status: "rendered",
      updatedAtIso: new Date().toISOString(),
      progress: {
        stage: "complete",
        percent: 1,
        renderedFrames: renderPlan.output.durationFrames,
        encodedFrames: renderPlan.output.durationFrames,
        totalFrames: renderPlan.output.durationFrames,
      },
      output: {
        fileName: renderedOutput.fileName,
        downloadUrl: `/api/render-jobs?jobId=${encodeURIComponent(jobId)}`,
        sizeBytes: renderedOutput.sizeBytes,
        contentType: renderedOutput.contentType,
      },
      nextStep: "Download the rendered MP4.",
    };
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : "Unable to render MP4.";

    renderJob = {
      ...renderJob,
      status: "render-failed",
      updatedAtIso: new Date().toISOString(),
      progress: {
        ...renderJob.progress,
        stage: "failed",
      },
      error: message,
      nextStep: "The render job package was saved, but MP4 rendering failed.",
    };
  } finally {
    await writeRenderJobFile(jobFolder, renderJob);
    activeRenderJobs.delete(jobId);
  }
}

export async function POST(request: Request) {
  if (!isLocalRenderBackendEnabled()) {
    return Response.json(
      {
        error:
          "MP4 export is unavailable on this hosted preview. Run the project locally to render, or connect a durable render worker.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const manifest = parseJsonField<VideoExportManifest>(formData, "manifest");
    const renderPlan = parseJsonField<VideoRenderPlan>(formData, "renderPlan");
    const jobId = `job-${randomUUID()}`;
    const relativeJobFolder = path.join(RENDER_JOBS_FOLDER, jobId);
    const jobFolder = getRenderJobFolder(jobId);

    await mkdir(path.join(jobFolder, "assets"), { recursive: true });

    const assetInputs = [
      { role: "audio" as const, value: formData.get("audio") },
      { role: "background" as const, value: formData.get("background") },
      { role: "logo" as const, value: formData.get("logo") },
    ];
    const uploadedAssets: RenderJobAsset[] = [];

    for (const assetInput of assetInputs) {
      if (isUploadedFile(assetInput.value)) {
        uploadedAssets.push(
          await saveUploadedAsset({
            file: assetInput.value,
            role: assetInput.role,
            jobFolder,
          })
        );
      }
    }

    if (!uploadedAssets.some((asset) => asset.role === "audio")) {
      return Response.json(
        { error: "A render job needs an uploaded audio asset." },
        { status: 400 }
      );
    }

    // LESSON CHECKPOINT:
    // The browser has File objects, but a real renderer needs durable file
    // paths. This route converts temporary browser uploads into a server-side
    // render job folder that future MP4 rendering can consume.
    const renderJob: VideoRenderJob = {
      id: jobId,
      status: "rendering",
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
      jobFolder: relativeJobFolder,
      renderPlan,
      assets: uploadedAssets,
      progress: {
        stage: "queued",
        percent: 0,
        renderedFrames: null,
        encodedFrames: null,
        totalFrames: renderPlan.output.durationFrames,
      },
      output: null,
      error: null,
      nextStep: "Rendering MP4. You can watch progress below.",
    };

    await writeFile(
      path.join(jobFolder, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );
    await writeFile(
      path.join(jobFolder, "render-plan.json"),
      JSON.stringify(renderPlan, null, 2)
    );
    await writeRenderJobFile(jobFolder, renderJob);

    void renderJobInBackground({
      origin: new URL(request.url).origin,
      jobId,
      jobFolder,
      manifest,
      renderPlan,
      uploadedAssets,
      initialRenderJob: renderJob,
    });

    return Response.json(renderJob, { status: 202 });
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : "Unable to create render job.";

    return Response.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId || !/^job-[a-f0-9-]+$/i.test(jobId)) {
      return Response.json({ error: "Invalid render job id." }, { status: 400 });
    }

    const jobFolder = getRenderJobFolder(jobId);
    const renderJob = await readRenderJobFile(jobFolder);
    const requestedAsset = url.searchParams.get("asset");
    const requestedStatus = url.searchParams.get("status");

    if (requestedStatus === "1") {
      return Response.json(renderJob);
    }

    if (
      requestedAsset === "audio" ||
      requestedAsset === "background" ||
      requestedAsset === "logo"
    ) {
      const asset = getRenderJobAsset(renderJob, requestedAsset);

      if (!asset) {
        return Response.json({ error: "Asset not found." }, { status: 404 });
      }

      const assetPath = path.join(jobFolder, "assets", asset.fileName);
      const assetStats = await stat(assetPath);
      const assetBuffer = await readFile(assetPath);

      return new Response(assetBuffer, {
        headers: {
          "Content-Type": asset.mimeType,
          "Content-Length": assetStats.size.toString(),
        },
      });
    }

    if (renderJob.status !== "rendered" || !renderJob.output) {
      return Response.json(
        { error: "Render job does not have a completed MP4 yet." },
        { status: 404 }
      );
    }

    const outputPath = path.join(jobFolder, renderJob.output.fileName);
    const outputStats = await stat(outputPath);
    const outputBuffer = await readFile(outputPath);

    return new Response(outputBuffer, {
      headers: {
        "Content-Type": renderJob.output.contentType,
        "Content-Length": outputStats.size.toString(),
        "Content-Disposition": `attachment; filename="${renderJob.output.fileName}"`,
      },
    });
  } catch {
    return Response.json(
      { error: "Unable to download rendered MP4." },
      { status: 404 }
    );
  }
}
