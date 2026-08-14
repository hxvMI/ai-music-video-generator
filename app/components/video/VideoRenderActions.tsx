"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileVideo, RefreshCcw } from "lucide-react";

import { buildRemotionCompositionConfig } from "@/lib/remotionCompositionConfig";
import {
  createClippedVideoExportManifest,
  getVideoRenderOutputFileName,
  prepareVideoRenderPlan,
} from "@/lib/videoExportManifest";
import {
  formatResolvedPresetSummary,
  resolveVisualPresets,
} from "@/lib/visualPresetSelection";
import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import type {
  PreparedVideoAssets,
  VideoProject,
  VideoExportManifest,
  VideoRenderJob,
} from "@/types/videoProject";

type VideoRenderActionsProps = {
  manifest: VideoExportManifest;
  preparedAssets: PreparedVideoAssets;
  assetFiles: VideoProject["assets"];
  blockingReasons: string[];
  currentTime: number;
};

type CompletedRenderJob = VideoRenderJob & {
  output: NonNullable<VideoRenderJob["output"]>;
};
type ExportLengthMode = "full" | "short";

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatStatusLabel(status: VideoRenderJob["status"] | null) {
  if (status === "rendered") return "Complete";
  if (status === "render-failed") return "Failed";
  if (status === "rendering") return "Rendering";
  if (status === "assets-uploaded") return "Uploading";

  return "Ready";
}

function getStatusTone({
  isBlocked,
  isSubmittingJob,
  status,
}: {
  isBlocked: boolean;
  isSubmittingJob: boolean;
  status: VideoRenderJob["status"] | null;
}) {
  if (isBlocked) return "waiting";
  if (isSubmittingJob || status === "rendering" || status === "assets-uploaded") {
    return "working";
  }
  if (status === "rendered") return "success";
  if (status === "render-failed") return "error";

  return "ready";
}

function getExportSignature(manifest: VideoExportManifest) {
  return JSON.stringify({
    metadata: manifest.metadata,
    assets: manifest.assets,
    background: {
      source: manifest.background.source,
      presetId: manifest.background.presetId,
      prompt: manifest.background.prompt,
      generation: manifest.background.generation,
    },
    style: manifest.style,
    renderSettings: manifest.renderSettings,
    audioAnalysisSummary: manifest.audioAnalysis?.summary ?? null,
    audioAnalysisPointCount: manifest.audioAnalysis?.points.length ?? 0,
  });
}

export default function VideoRenderActions({
  manifest,
  preparedAssets,
  assetFiles,
  blockingReasons,
  currentTime,
}: VideoRenderActionsProps) {
  const isHostedRenderDisabled =
    process.env.NEXT_PUBLIC_RENDER_BACKEND === "disabled";
  const [renderJob, setRenderJob] = useState<VideoRenderJob | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [renderJobError, setRenderJobError] = useState<string | null>(null);
  const [exportLengthMode, setExportLengthMode] =
    useState<ExportLengthMode>("full");
  const [clipStartSeconds, setClipStartSeconds] = useState(0);
  const [clipDurationSeconds, setClipDurationSeconds] = useState(30);
  const [submittedExportSignature, setSubmittedExportSignature] = useState<
    string | null
  >(null);
  const sourceDurationSeconds =
    manifest.timeline.sourceDurationSeconds ||
    manifest.renderSettings.durationSeconds;
  const activeManifest = useMemo(() => {
    if (exportLengthMode === "full") return manifest;

    return createClippedVideoExportManifest({
      manifest,
      startSeconds: clipStartSeconds,
      durationSeconds: clipDurationSeconds,
    });
  }, [clipDurationSeconds, clipStartSeconds, exportLengthMode, manifest]);
  const clipBlockingReasons =
    exportLengthMode === "short" && sourceDurationSeconds <= 1
      ? ["Choose a track longer than one second for a short clip."]
      : [];
  const activeBlockingReasons = [
    ...blockingReasons,
    ...clipBlockingReasons,
    ...(isHostedRenderDisabled
      ? ["MP4 export is available in the local app; this hosted preview has no render worker connected."]
      : []),
  ];
  const isBlocked = activeBlockingReasons.length > 0;
  const exportSignature = useMemo(() => {
    return getExportSignature(activeManifest);
  }, [activeManifest]);
  const hasChangedSinceExport =
    submittedExportSignature !== null &&
    submittedExportSignature !== exportSignature;
  const isRendering = renderJob?.status === "rendering";
  const completedRenderJob =
    renderJob?.status === "rendered" && renderJob.output
      ? (renderJob as CompletedRenderJob)
      : null;
  const failedMessage =
    renderJob?.status === "render-failed"
      ? renderJob.error ?? "Unable to render MP4."
      : renderJobError;
  const isExporting = isSubmittingJob || isRendering;
  const activeRenderJobId = renderJob?.id ?? null;
  const activeRenderJobStatus = renderJob?.status ?? null;
  const renderProgressPercent = Math.round(
    Math.min(Math.max(renderJob?.progress.percent ?? 0, 0), 1) * 100
  );
  const resolvedPresets = useMemo(() => {
    return resolveVisualPresets({
      style: activeManifest.style,
      audioAnalysis: activeManifest.audioAnalysis,
    });
  }, [activeManifest.audioAnalysis, activeManifest.style]);
  const exportButtonLabel = isSubmittingJob
    ? "Uploading..."
    : isRendering
      ? "Rendering..."
      : failedMessage
        ? "Retry Export"
        : "Export MP4";

  const createRenderPlan = () => {
    if (isBlocked) return null;

    const compositionConfig = buildRemotionCompositionConfig({
      manifest: activeManifest,
      preparedAssets,
    });

    return prepareVideoRenderPlan(
      activeManifest,
      preparedAssets,
      compositionConfig
    );
  };

  const handleExportMp4 = async () => {
    const nextRenderPlan = createRenderPlan();

    if (!nextRenderPlan || !assetFiles.audioFile) return;

    const formData = new FormData();
    formData.append("manifest", JSON.stringify(activeManifest));
    formData.append("renderPlan", JSON.stringify(nextRenderPlan));
    formData.append("audio", assetFiles.audioFile);

    if (
      activeManifest.background.source === "upload" &&
      assetFiles.backgroundImage
    ) {
      formData.append("background", assetFiles.backgroundImage);
    }

    if (assetFiles.logoImage) {
      formData.append("logo", assetFiles.logoImage);
    }

    setIsSubmittingJob(true);
    setRenderJob(null);
    setRenderJobError(null);
    setSubmittedExportSignature(exportSignature);

    try {
      const response = await fetch("/api/render-jobs", {
        method: "POST",
        body: formData,
      });
      const responseBody = await response.json();

      if (!response.ok) {
        if (responseBody.id) {
          setRenderJob(responseBody as VideoRenderJob);
        }

        throw new Error(responseBody.error ?? "Unable to create render job.");
      }

      setRenderJob(responseBody as VideoRenderJob);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Unable to create render job.";

      setRenderJobError(message);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  useEffect(() => {
    if (!activeRenderJobId || activeRenderJobStatus !== "rendering") return;

    const pollRenderStatus = async () => {
      try {
        const response = await fetch(
          `/api/render-jobs?jobId=${encodeURIComponent(activeRenderJobId)}&status=1`
        );

        if (!response.ok) return;

        const nextRenderJob = (await response.json()) as VideoRenderJob;

        setRenderJob(nextRenderJob);
      } catch {
        // Polling is best-effort. If one status request fails, the next
        // interval can recover without discarding the current job card.
      }
    };

    const intervalId = window.setInterval(pollRenderStatus, 1500);

    void pollRenderStatus();

    return () => window.clearInterval(intervalId);
  }, [activeRenderJobId, activeRenderJobStatus]);

  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-700 text-white">
            <FileVideo aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-950">Export MP4</h2>
            <p className="text-sm text-gray-600">
              Render the current preview into a downloadable video.
            </p>
          </div>
        </div>

        <StatusPill
          label={
            isBlocked
              ? "Blocked"
              : isSubmittingJob
                ? "Uploading"
                : formatStatusLabel(renderJob?.status ?? null)
          }
          tone={getStatusTone({
            isBlocked,
            isSubmittingJob,
            status: renderJob?.status ?? null,
          })}
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border bg-white p-3 text-sm">
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border">
          {(["full", "short"] as ExportLengthMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setExportLengthMode(mode)}
              className={[
                "px-3 py-2 font-medium capitalize",
                exportLengthMode === mode
                  ? "bg-gray-950 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {mode === "full" ? "Full video" : "Short clip"}
            </button>
          ))}
        </div>

        {exportLengthMode === "short" && (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="flex flex-col gap-1 font-medium text-gray-700">
              Clip start
              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  min={0}
                  max={Math.max(sourceDurationSeconds - 1, 0)}
                  step={1}
                  value={Math.round(clipStartSeconds)}
                  onChange={(event) =>
                    setClipStartSeconds(Number(event.target.value) || 0)
                  }
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setClipStartSeconds(
                      Math.min(currentTime, Math.max(sourceDurationSeconds - 1, 0))
                    )
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-700"
                >
                  Use current time
                </button>
              </div>
              <span className="text-xs font-normal text-gray-500">
                Starts at {formatDuration(activeManifest.timeline.startsAtSeconds)}
                , ends at {formatDuration(activeManifest.timeline.endsAtSeconds)}
              </span>
            </label>

            <label className="flex flex-col gap-1 font-medium text-gray-700">
              Clip length
              <select
                value={clipDurationSeconds}
                onChange={(event) =>
                  setClipDurationSeconds(Number(event.target.value))
                }
                className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border bg-gray-50 p-3 text-sm md:grid-cols-2">
        {/* LESSON CHECKPOINT - Export summary:
            This is derived display data. The actual render job still receives
            the manifest, uploaded files, and generated render plan when the
            user starts export.
        */}
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Track</p>
          <p className="font-medium text-gray-950">
            {activeManifest.metadata.artistName || "No artist"} -{" "}
            {activeManifest.metadata.songTitle || "No title"}
          </p>
          <p className="text-gray-600">
            {exportLengthMode === "short" ? "Short clip" : "Full video"} -{" "}
            {formatDuration(activeManifest.renderSettings.durationSeconds)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Output</p>
          <p className="font-medium text-gray-950">
            {getVideoRenderOutputFileName(activeManifest)}
          </p>
          <p className="text-gray-600">
            {activeManifest.renderSettings.width}x
            {activeManifest.renderSettings.height},{" "}
            {activeManifest.renderSettings.fps}fps, MP4
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Visuals</p>
          <p className="font-medium text-gray-950">
            {activeManifest.style.visualMode} mode
          </p>
          <p className="text-gray-600">
            {formatResolvedPresetSummary(resolvedPresets)}
          </p>
          {activeManifest.style.visualMode === "auto" && (
            <p className="text-gray-600">
              {activeManifest.style.reactiveTimeline.zones.length}{" "}
              {activeManifest.style.reactiveTimeline.mode} arrangement zones
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Assets</p>
          <p className="font-medium text-gray-950">
            Background:{" "}
            {activeManifest.assets.background.fileName ?? "None"}
          </p>
          <p className="text-gray-600">
            Logo:{" "}
            {activeManifest.assets.logo.isAvailableInBrowser ? "Attached" : "None"}
          </p>
        </div>
      </div>

      {isBlocked && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-medium">Export is waiting on:</p>
          <ul className="mt-2 list-inside list-disc">
            {activeBlockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isBlocked || isExporting}
          onClick={handleExportMp4}
          className="inline-flex items-center gap-2 rounded border border-gray-950 bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {failedMessage ? (
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Download aria-hidden="true" className="h-4 w-4" />
          )}
          {exportButtonLabel}
        </button>

        {!isBlocked && !renderJob && !renderJobError && (
          <p className="text-sm text-gray-600">
            Ready to render with the current preview settings.
          </p>
        )}
        {!isBlocked && hasChangedSinceExport && !isExporting && (
          <p className="text-sm font-medium text-amber-700">
            Project settings changed since the last export.
          </p>
        )}
      </div>

      {isExporting && renderJob && (
        <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-cyan-950">
            <span>{renderJob.progress.stage}</span>
            <span>{renderProgressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-white">
            <div
              className="h-full rounded bg-cyan-700 transition-all"
              style={{ width: `${renderProgressPercent}%` }}
            />
          </div>
          {renderJob.progress.renderedFrames !== null && (
            <p className="mt-2 text-xs text-cyan-900">
              Frames: {renderJob.progress.renderedFrames} rendered,{" "}
              {renderJob.progress.encodedFrames ?? 0} encoded /{" "}
              {renderJob.progress.totalFrames}
            </p>
          )}
          <p className="mt-2 text-cyan-900">{renderJob.nextStep}</p>
        </div>
      )}

      {isSubmittingJob && !renderJob && (
        <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">
          Uploading assets and creating a local render job...
        </div>
      )}

      {completedRenderJob && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p className="font-medium">Export complete</p>
          <p className="mt-1">
            {completedRenderJob.output.fileName} -{" "}
            {formatBytes(completedRenderJob.output.sizeBytes)}
          </p>
          <p className="mt-1">
            {completedRenderJob.renderPlan.summary.artist} -{" "}
            {completedRenderJob.renderPlan.summary.title}
          </p>
          <p className="mt-1">
            {formatResolvedPresetSummary(
              completedRenderJob.renderPlan.summary.resolvedPresets
            )}
          </p>
          {completedRenderJob.renderPlan.summary.visualMode === "auto" && (
            <p className="mt-1">
              {completedRenderJob.renderPlan.summary.reactiveZoneCount}{" "}
              {completedRenderJob.renderPlan.summary.reactiveTimelineMode}{" "}
              arrangement zones
            </p>
          )}
          {hasChangedSinceExport && (
            <p className="mt-2 font-medium text-amber-700">
              This download was rendered before your latest project changes.
            </p>
          )}
          <a
            href={completedRenderJob.output.downloadUrl}
            className="mt-3 inline-flex items-center gap-2 rounded border border-emerald-800 bg-white px-3 py-2 font-medium text-emerald-950"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download MP4
          </a>
        </div>
      )}

      {failedMessage && !isExporting && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Export failed</p>
          <p className="mt-1">{failedMessage}</p>
          <button
            type="button"
            disabled={isBlocked}
            onClick={handleExportMp4}
            className="mt-3 inline-flex items-center gap-2 rounded border border-red-800 bg-white px-3 py-2 font-medium text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
            Retry Export
          </button>
        </div>
      )}
    </Panel>
  );
}
