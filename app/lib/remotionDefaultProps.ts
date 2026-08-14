import {
  buildGeneratedBackgroundDataUrl,
  DEFAULT_BACKGROUND_PRESET_ID,
  DEFAULT_BACKGROUND_PROMPT,
} from "./backgroundStudio";
import { MUSIC_VIDEO_COMPOSITION_ID } from "./remotionCompositionConfig";
import { DEFAULT_VIDEO_CAPTIONS } from "./videoCaptions";
import { DEFAULT_VIDEO_LAYOUT } from "./videoLayout";
import type { MusicVideoCompositionProps, VideoExportManifest } from "../types/videoProject";

const DEFAULT_BACKGROUND_DATA_URL = buildGeneratedBackgroundDataUrl({
  presetId: DEFAULT_BACKGROUND_PRESET_ID,
  prompt: DEFAULT_BACKGROUND_PROMPT,
});

export const DEFAULT_REMOTION_MANIFEST: VideoExportManifest = {
  version: 2,
  metadata: {
    songTitle: "Song Title",
    artistName: "Artist Name",
  },
  assets: {
    audio: {
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      lastModified: null,
      isAvailableInBrowser: false,
    },
    background: {
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      lastModified: null,
      isAvailableInBrowser: false,
    },
    logo: {
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      lastModified: null,
      isAvailableInBrowser: false,
    },
  },
  background: {
    source: "generated",
    presetId: DEFAULT_BACKGROUND_PRESET_ID,
    prompt: DEFAULT_BACKGROUND_PROMPT,
    generatedDataUrl: DEFAULT_BACKGROUND_DATA_URL,
    generation: {
      provider: "local",
      model: null,
      generationId: null,
    },
  },
  style: {
    theme: "minimal",
    visualizerColor: "#00FFFF",
    visualMode: "manual",
    visualizerPreset: "minimal",
    cameraPreset: "float",
    effectPreset: "glow",
    randomSeed: 1,
    reactiveTimeline: {
      mode: "auto",
      zones: [],
    },
    layout: DEFAULT_VIDEO_LAYOUT,
    captions: DEFAULT_VIDEO_CAPTIONS,
  },
  renderSettings: {
    width: 1920,
    height: 1080,
    fps: 30,
    durationSeconds: 5,
    durationFrames: 150,
  },
  timeline: {
    startsAtSeconds: 0,
    endsAtSeconds: 5,
    sourceDurationSeconds: 5,
  },
  audioAnalysis: null,
};

export const DEFAULT_REMOTION_INPUT_PROPS: MusicVideoCompositionProps = {
  manifest: DEFAULT_REMOTION_MANIFEST,
  assetUrls: {
    audioUrl: null,
    backgroundUrl: DEFAULT_BACKGROUND_DATA_URL,
    logoUrl: null,
  },
};

export function getMusicVideoCompositionMetadata({
  props,
}: {
  props: MusicVideoCompositionProps;
}) {
  // LESSON CHECKPOINT:
  // calculateMetadata lets Remotion size and time the composition from runtime
  // props. That matters here because each uploaded song can have a different
  // duration.
  return {
    id: MUSIC_VIDEO_COMPOSITION_ID,
    durationInFrames: Math.max(props.manifest.renderSettings.durationFrames, 1),
    fps: props.manifest.renderSettings.fps,
    width: props.manifest.renderSettings.width,
    height: props.manifest.renderSettings.height,
  };
}
