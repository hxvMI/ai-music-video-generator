import type {
  CameraPreset,
  EffectPreset,
  VideoAudioAnalysis,
  VisualMode,
  VisualizerPreset,
} from "../types/videoProject";

export const VISUALIZER_PRESETS: VisualizerPreset[] = [
  "minimal",
  "neon",
  "cinematic",
  "waveform",
  "spectrum",
  "stacked",
  "radial",
  "ribbon",
  "cityscape",
];

export const CAMERA_PRESETS: CameraPreset[] = [
  "locked",
  "steady",
  "float",
  "drift",
  "pulse",
  "shake",
];
export const EFFECT_PRESETS: EffectPreset[] = [
  "none",
  "clean",
  "glow",
  "flash",
  "strobe",
  "vignette",
];

export type ResolvedVisualPresets = {
  visualizerPreset: VisualizerPreset;
  cameraPreset: CameraPreset;
  effectPreset: EffectPreset;
  reason: string;
};
type VisualPresetStyleInput = {
  visualMode: VisualMode;
  visualizerPreset: VisualizerPreset;
  cameraPreset: CameraPreset;
  effectPreset: EffectPreset;
  randomSeed: number;
};

export const VISUAL_PRESET_LABELS: Record<
  VisualizerPreset | CameraPreset | EffectPreset,
  string
> = {
  minimal: "Minimal",
  neon: "Neon",
  cinematic: "Cinematic",
  waveform: "Waveform",
  spectrum: "Spectrum",
  stacked: "Stacked",
  radial: "Radial",
  ribbon: "Ribbon",
  cityscape: "Cityscape",
  locked: "Locked",
  steady: "Steady",
  float: "Float",
  drift: "Drift",
  pulse: "Pulse",
  shake: "Shake",
  none: "None",
  clean: "Clean",
  glow: "Glow",
  flash: "Flash",
  strobe: "Strobe",
  vignette: "Vignette",
};

export function formatResolvedPresetSummary(presets: ResolvedVisualPresets) {
  return `${VISUAL_PRESET_LABELS[presets.visualizerPreset]} visualizer, ${VISUAL_PRESET_LABELS[presets.cameraPreset]} camera, ${VISUAL_PRESET_LABELS[presets.effectPreset]} effects`;
}

function pickSeeded<T>(items: T[], seed: number, salt: number) {
  const index = Math.abs(Math.floor(seed + salt * 101)) % items.length;

  return items[index];
}

function resolveAutoPresets(
  audioAnalysis: VideoAudioAnalysis | null
): ResolvedVisualPresets {
  const summary = audioAnalysis?.summary;

  if (!summary) {
    return {
      visualizerPreset: "minimal",
      cameraPreset: "locked",
      effectPreset: "none",
      reason: "Waiting for audio analysis, using a calm fallback.",
    };
  }

  const dropDensity =
    summary.dropCount / Math.max(audioAnalysis.durationSeconds / 60, 0.25);

  if (summary.peakEnergy > 0.82 || dropDensity >= 7) {
    return {
      visualizerPreset: dropDensity >= 9 ? "cityscape" : "radial",
      cameraPreset: dropDensity >= 9 ? "shake" : "pulse",
      effectPreset: dropDensity >= 9 ? "strobe" : "flash",
      reason: "High peaks or frequent drops call for stronger motion.",
    };
  }

  if (summary.averageEnergy < 0.34 && dropDensity < 3) {
    return {
      visualizerPreset: "cinematic",
      cameraPreset: "drift",
      effectPreset: "vignette",
      reason: "Lower average energy fits slower cinematic movement.",
    };
  }

  if (summary.averageEnergy > 0.62) {
    return {
      visualizerPreset: "ribbon",
      cameraPreset: "pulse",
      effectPreset: "glow",
      reason: "Sustained energy gets denser bars and pulse movement.",
    };
  }

  return {
    visualizerPreset: "waveform",
    cameraPreset: "float",
    effectPreset: "glow",
    reason: "Balanced energy gets a readable visualizer with gentle motion.",
  };
}

export function resolveVisualPresets({
  style,
  audioAnalysis,
}: {
  style: VisualPresetStyleInput;
  audioAnalysis: VideoAudioAnalysis | null;
}): ResolvedVisualPresets {
  if (style.visualMode === "auto") {
    return resolveAutoPresets(audioAnalysis);
  }

  if (style.visualMode === "random") {
    return {
      visualizerPreset: pickSeeded(VISUALIZER_PRESETS, style.randomSeed, 1),
      cameraPreset: pickSeeded(CAMERA_PRESETS, style.randomSeed, 2),
      effectPreset: pickSeeded(EFFECT_PRESETS, style.randomSeed, 3),
      reason: "Seeded random choices stay stable in preview and export.",
    };
  }

  // LESSON CHECKPOINT:
  // Manual mode trusts the user's selected presets. Random and Auto resolve to
  // this same shape so rendering code does not need separate branches.
  return {
    visualizerPreset: style.visualizerPreset,
    cameraPreset: style.cameraPreset,
    effectPreset: style.effectPreset,
    reason: "Manual selections are applied directly.",
  };
}
