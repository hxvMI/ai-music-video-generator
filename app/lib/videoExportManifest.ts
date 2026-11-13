import type {
  ExportAssetReference,
  PreparedVideoAssets,
  RemotionCompositionConfig,
  VideoExportManifest,
  VideoProject,
  VideoRenderPlan,
} from "@/types/videoProject";
import { getBackgroundPreset } from "@/lib/backgroundStudio";
import { resolveVisualPresets } from "@/lib/visualPresetSelection";

const RENDER_WIDTH = 1920;
const RENDER_HEIGHT = 1080;
export const VIDEO_RENDER_FPS = 30;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function fileToAssetReference(file: File | null): ExportAssetReference {
  return {
    fileName: file?.name ?? null,
    mimeType: file?.type ?? null,
    sizeBytes: file?.size ?? null,
    lastModified: file?.lastModified ?? null,
    isAvailableInBrowser: file !== null,
  };
}

function getBackgroundAssetReference(project: VideoProject): ExportAssetReference {
  if (
    project.background.source === "upload" &&
    project.assets.backgroundImage
  ) {
    return fileToAssetReference(project.assets.backgroundImage);
  }

  if (project.background.source === "upload") {
    return fileToAssetReference(null);
  }

  const preset = getBackgroundPreset(project.background.presetId);
  const isAiGenerated = project.background.generation.provider === "openai";

  return {
    fileName: isAiGenerated
      ? `${preset.label} AI background.jpg`
      : `${preset.label} generated background.svg`,
    mimeType: isAiGenerated ? "image/jpeg" : "image/svg+xml",
    sizeBytes: project.background.generatedDataUrl.length,
    lastModified: null,
    isAvailableInBrowser: true,
  };
}

export function buildVideoExportManifest(
  project: VideoProject
): VideoExportManifest {
  const durationSeconds = Math.max(project.playback.duration, 0);

  return {
    version: 3,
    metadata: {
      songTitle: project.metadata.songTitle.trim(),
      artistName: project.metadata.artistName.trim(),
    },
    assets: {
      audio: fileToAssetReference(project.assets.audioFile),
      background: getBackgroundAssetReference(project),
      logo: fileToAssetReference(project.assets.logoImage),
    },
    background: project.background,
    style: {
      theme: project.style.theme,
      visualizerColor: project.style.visualizerColor,
      visualMode: project.style.visualMode,
      visualizerPreset: project.style.visualizerPreset,
      cameraPreset: project.style.cameraPreset,
      effectPreset: project.style.effectPreset,
      randomSeed: project.style.randomSeed,
      reactiveTimeline: project.style.reactiveTimeline,
      layout: project.style.layout,
      captions: project.style.captions,
    },
    renderSettings: {
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      fps: VIDEO_RENDER_FPS,
      durationSeconds,
      durationFrames: Math.ceil(durationSeconds * VIDEO_RENDER_FPS),
    },
    timeline: {
      startsAtSeconds: 0,
      endsAtSeconds: durationSeconds,
      sourceDurationSeconds: durationSeconds,
    },
    audioAnalysis: project.audioAnalysis,
  };
}

export function getVideoExportBlockingReasons(
  manifest: VideoExportManifest
): string[] {
  const blockingReasons: string[] = [];

  if (!manifest.assets.audio.isAvailableInBrowser) {
    blockingReasons.push("Upload an audio file.");
  }

  if (manifest.renderSettings.durationSeconds <= 0) {
    blockingReasons.push("Load audio metadata so duration is available.");
  }

  if (!manifest.audioAnalysis) {
    blockingReasons.push("Wait for reactive audio analysis to complete.");
  }

  if (
    manifest.background.source === "upload" &&
    !manifest.assets.background.isAvailableInBrowser
  ) {
    blockingReasons.push("Upload a background image or select Generated.");
  }

  return blockingReasons;
}

function slugifyFilePart(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "music-video";
}

export function getVideoRenderOutputFileName(manifest: VideoExportManifest) {
  const sourceDuration =
    manifest.timeline.sourceDurationSeconds ||
    manifest.renderSettings.durationSeconds;
  const isClip =
    manifest.timeline.startsAtSeconds > 0.01 ||
    manifest.renderSettings.durationSeconds < sourceDuration - 0.01;
  const fileNameBase = slugifyFilePart(
    `${manifest.metadata.artistName}-${manifest.metadata.songTitle}`
  );
  const clipSuffix = isClip
    ? `-clip-${Math.floor(manifest.timeline.startsAtSeconds)}s`
    : "";

  return `${fileNameBase}${clipSuffix}.mp4`;
}

export function createClippedVideoExportManifest({
  manifest,
  startSeconds,
  durationSeconds,
}: {
  manifest: VideoExportManifest;
  startSeconds: number;
  durationSeconds: number;
}): VideoExportManifest {
  const sourceDuration =
    manifest.timeline.sourceDurationSeconds ||
    manifest.renderSettings.durationSeconds;
  const safeDuration = Math.max(durationSeconds, 1);
  const safeStart = clamp(startSeconds, 0, Math.max(sourceDuration - 1, 0));
  const safeEnd = clamp(safeStart + safeDuration, safeStart + 1, sourceDuration);
  const renderDurationSeconds = Math.max(safeEnd - safeStart, 1);

  return {
    ...manifest,
    renderSettings: {
      ...manifest.renderSettings,
      durationSeconds: renderDurationSeconds,
      durationFrames: Math.max(
        Math.ceil(renderDurationSeconds * manifest.renderSettings.fps),
        1
      ),
    },
    timeline: {
      startsAtSeconds: safeStart,
      endsAtSeconds: safeEnd,
      sourceDurationSeconds: sourceDuration,
    },
  };
}

export function prepareVideoRenderPlan(
  manifest: VideoExportManifest,
  preparedAssets: PreparedVideoAssets,
  compositionConfig: RemotionCompositionConfig
): VideoRenderPlan {
  const createdAtIso = new Date().toISOString();
  const resolvedPresets = resolveVisualPresets({
    style: manifest.style,
    audioAnalysis: manifest.audioAnalysis,
  });

  return {
    id: `render-${Date.now()}`,
    status: "prepared",
    createdAtIso,
    manifestVersion: manifest.version,
    compositionId: compositionConfig.compositionId,
    output: {
      fileName: getVideoRenderOutputFileName(manifest),
      format: "mp4",
      width: manifest.renderSettings.width,
      height: manifest.renderSettings.height,
      fps: manifest.renderSettings.fps,
      durationFrames: manifest.renderSettings.durationFrames,
    },
    browserAssets: {
      audioUrl: preparedAssets.audio.url,
      backgroundUrl: preparedAssets.background.url,
      logoUrl: preparedAssets.logo.url,
    },
    summary: {
      title: manifest.metadata.songTitle,
      artist: manifest.metadata.artistName,
      theme: manifest.style.theme,
      visualMode: manifest.style.visualMode,
      reactiveTimelineMode: manifest.style.reactiveTimeline.mode,
      reactiveZoneCount: manifest.style.reactiveTimeline.zones.length,
      resolvedPresets,
    },
  };
}
