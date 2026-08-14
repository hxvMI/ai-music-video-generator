export type VideoTheme =
  | "minimal"
  | "neon"
  | "cinematic"
  | "editorial"
  | "dreamscape"
  | "monochrome"
  | "retro";
export type ProgressStyle =
  | "solid"
  | "glow"
  | "gradient"
  | "segmented"
  | "minimal"
  | "pulse";
export type VisualMode = "manual" | "random" | "auto";
export type VisualizerPreset =
  | "minimal"
  | "neon"
  | "cinematic"
  | "waveform"
  | "spectrum"
  | "stacked"
  | "radial"
  | "ribbon"
  | "cityscape";
export type CameraPreset =
  | "locked"
  | "steady"
  | "float"
  | "drift"
  | "pulse"
  | "shake";
export type EffectPreset =
  | "none"
  | "clean"
  | "glow"
  | "flash"
  | "strobe"
  | "vignette";
export type ReactiveZoneKind =
  | "intro"
  | "steady"
  | "build"
  | "drop"
  | "breakdown"
  | "outro";
export type ReactiveTimelineMode = "auto" | "custom";
export type ReactiveZone = {
  id: string;
  kind: ReactiveZoneKind;
  startSeconds: number;
  endSeconds: number;
  intensity: number;
  visualizerPreset: VisualizerPreset;
  cameraPreset: CameraPreset;
  effectPreset: EffectPreset;
};
export type ReactiveTimeline = {
  mode: ReactiveTimelineMode;
  zones: ReactiveZone[];
};
export type OverlayPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
export type VisualizerLayer = {
  id: string;
  name: string;
  enabled: boolean;
  preset: VisualizerPreset | "active";
  color: string | null;
  position: OverlayPosition;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  reactivity: number;
};
export type VideoLayoutConfig = {
  backgroundScale: number;
  backgroundOffsetX: number;
  backgroundOffsetY: number;
  titlePosition: OverlayPosition;
  titleOffsetX: number;
  titleOffsetY: number;
  titleRotation: number;
  visualizerPosition: OverlayPosition;
  visualizerOffsetX: number;
  visualizerOffsetY: number;
  visualizerScaleX: number;
  visualizerScaleY: number;
  visualizerLayers: VisualizerLayer[];
  showProgress: boolean;
  progressPosition: OverlayPosition;
  progressOffsetX: number;
  progressOffsetY: number;
  progressWidth: number;
  progressHeight: number;
  progressStyle: ProgressStyle;
  progressRotation: number;
  showProgressTime: boolean;
  progressTimePosition: OverlayPosition;
  progressTimeOffsetX: number;
  progressTimeOffsetY: number;
  progressTimeRotation: number;
};
export type CaptionMode = "off" | "beat" | "lyrics";
export type VideoCaptionConfig = {
  mode: CaptionMode;
  lyricsText: string;
  position: OverlayPosition;
  offsetX: number;
  offsetY: number;
  fontSize: number;
  rotation: number;
  showBeatDrops: boolean;
};
export type BackgroundSource = "upload" | "generated";
export type AiProvider = "server" | "openai" | "cloudflare";
export type AiProviderConnection = {
  provider: AiProvider;
  openAiApiKey: string;
  cloudflareAccountId: string;
  cloudflareApiToken: string;
};
export type BackgroundGenerationProvider = "local" | "openai" | "cloudflare";
export type BackgroundPresetId =
  | "clean-gradient"
  | "neon-stage"
  | "cinematic-dark"
  | "soft-lofi";

export type BackgroundPromptFields = {
  mood: string;
  scene: string;
  colorDirection: string;
  avoid: string;
};

export type VideoBackgroundConfig = {
  source: BackgroundSource;
  presetId: BackgroundPresetId;
  prompt: BackgroundPromptFields;
  generatedDataUrl: string;
  generation: {
    provider: BackgroundGenerationProvider;
    model: string | null;
    generationId: string | null;
  };
};

export type BackgroundGenerationRequest = {
  presetId: BackgroundPresetId;
  prompt: BackgroundPromptFields;
};

export type BackgroundGenerationResponse = {
  dataUrl: string;
  mimeType: "image/jpeg";
  provider: "openai" | "cloudflare";
  model: string;
  generationId: string;
};

export type BackgroundGenerationErrorResponse = {
  error: string;
  code:
    | "invalid_request"
    | "missing_api_key"
    | "provider_error"
    | "invalid_provider_response";
};
export type AudioTranscriptionResponse = {
  text: string;
  provider: "openai" | "cloudflare";
  model: string;
  transcriptId: string;
};
export type AudioTranscriptionErrorResponse = {
  error: string;
  code:
    | "invalid_request"
    | "missing_api_key"
    | "provider_error"
    | "invalid_provider_response";
};

export type AudioAnalysisPoint = {
  time: number;
  energy: number;
  onset: number;
};

export type VideoAudioAnalysis = {
  durationSeconds: number;
  hopSeconds: number;
  points: AudioAnalysisPoint[];
  dropTimes: number[];
  summary: {
    averageEnergy: number;
    peakEnergy: number;
    dropCount: number;
  };
};

export type VideoProject = {
  metadata: {
    songTitle: string;
    artistName: string;
  };
  assets: {
    audioFile: File | null;
    backgroundImage: File | null;
    logoImage: File | null;
  };
  background: VideoBackgroundConfig;
  style: {
    theme: VideoTheme;
    visualizerColor: string;
    visualMode: VisualMode;
    visualizerPreset: VisualizerPreset;
    cameraPreset: CameraPreset;
    effectPreset: EffectPreset;
    randomSeed: number;
    reactiveTimeline: ReactiveTimeline;
    layout: VideoLayoutConfig;
    captions: VideoCaptionConfig;
  };
  playback: {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
  };
  audioAnalysis: VideoAudioAnalysis | null;
};

export type PreparedAsset = {
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  isReady: boolean;
};

export type PreparedVideoAssets = {
  audio: PreparedAsset;
  background: PreparedAsset;
  logo: PreparedAsset;
};

export type ExportAssetReference = {
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  lastModified: number | null;
  isAvailableInBrowser: boolean;
};

export type VideoExportManifest = {
  version: 2;
  metadata: {
    songTitle: string;
    artistName: string;
  };
  assets: {
    audio: ExportAssetReference;
    background: ExportAssetReference;
    logo: ExportAssetReference;
  };
  background: VideoBackgroundConfig;
  style: {
    theme: VideoTheme;
    visualizerColor: string;
    visualMode: VisualMode;
    visualizerPreset: VisualizerPreset;
    cameraPreset: CameraPreset;
    effectPreset: EffectPreset;
    randomSeed: number;
    reactiveTimeline: ReactiveTimeline;
    layout: VideoLayoutConfig;
    captions: VideoCaptionConfig;
  };
  renderSettings: {
    width: number;
    height: number;
    fps: number;
    durationSeconds: number;
    durationFrames: number;
  };
  timeline: {
    startsAtSeconds: number;
    endsAtSeconds: number;
    sourceDurationSeconds: number;
  };
  audioAnalysis: VideoAudioAnalysis | null;
};

export type VideoRenderPlan = {
  id: string;
  status: "prepared";
  createdAtIso: string;
  manifestVersion: VideoExportManifest["version"];
  compositionId: RemotionCompositionConfig["compositionId"];
  output: {
    fileName: string;
    format: "mp4";
    width: number;
    height: number;
    fps: number;
    durationFrames: number;
  };
  browserAssets: {
    audioUrl: string | null;
    backgroundUrl: string | null;
    logoUrl: string | null;
  };
  summary: {
    title: string;
    artist: string;
    theme: VideoTheme;
    visualMode: VisualMode;
    reactiveTimelineMode: ReactiveTimelineMode;
    reactiveZoneCount: number;
    resolvedPresets: {
      visualizerPreset: VisualizerPreset;
      cameraPreset: CameraPreset;
      effectPreset: EffectPreset;
      reason: string;
    };
  };
};

export type RenderJobAsset = {
  role: "audio" | "background" | "logo";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type VideoRenderJob = {
  id: string;
  status: "assets-uploaded" | "rendering" | "rendered" | "render-failed";
  createdAtIso: string;
  updatedAtIso: string;
  jobFolder: string;
  renderPlan: VideoRenderPlan;
  assets: RenderJobAsset[];
  progress: {
    stage: "queued" | "bundling" | "resolving-composition" | "rendering" | "finalizing" | "complete" | "failed";
    percent: number;
    renderedFrames: number | null;
    encodedFrames: number | null;
    totalFrames: number;
  };
  output: null | {
    fileName: string;
    downloadUrl: string;
    sizeBytes: number;
    contentType: "video/mp4";
  };
  error: string | null;
  nextStep: string;
};

export type RemotionAssetUrls = {
  audioUrl: string | null;
  backgroundUrl: string | null;
  logoUrl: string | null;
};

export type MusicVideoCompositionProps = {
  manifest: VideoExportManifest;
  assetUrls: RemotionAssetUrls;
};

export type RemotionCompositionConfig = {
  compositionId: "MusicVideo";
  inputProps: MusicVideoCompositionProps;
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  fps: number;
};
