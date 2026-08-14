import type { VideoTheme, VisualizerPreset } from "../types/videoProject";

export type VisualizerVariant = VisualizerPreset;
export type VideoThemeLayout = "lower-left" | "center-stage" | "film-lower-left";
export type VideoFrameTreatment =
  | "none"
  | "letterbox"
  | "side-matte"
  | "lower-panel"
  | "upper-panel"
  | "broadcast-frame";

export type VideoThemePreset = {
  label: string;
  description: string;
  layout: VideoThemeLayout;
  visualizerVariant: VisualizerVariant;
  introEnd: number;
  titleStartY: number;
  titleStartScale: number;
  logoStart: number;
  logoEnd: number;
  overlayOpacity: number;
  textShadow: string;
  progressGlow: string;
  backgroundStartScale: number;
  backgroundEndScale: number;
  backgroundFilter: string;
  progressTrackOpacity: number;
  frameTreatment: VideoFrameTreatment;
};

// LESSON CHECKPOINT:
// Theme presets are configuration objects. They let us change behavior without
// scattering "if theme is neon" checks through every preview/render component.
export const VIDEO_THEME_PRESETS: Record<VideoTheme, VideoThemePreset> = {
  minimal: {
    label: "Minimal",
    description: "Clean lower-left title with restrained motion.",
    layout: "lower-left",
    visualizerVariant: "minimal",
    introEnd: 1.1,
    titleStartY: 18,
    titleStartScale: 1,
    logoStart: 0.4,
    logoEnd: 1.4,
    overlayOpacity: 0.42,
    textShadow: "0 2px 10px rgba(0, 0, 0, 0.65)",
    progressGlow: "none",
    backgroundStartScale: 1,
    backgroundEndScale: 1.015,
    backgroundFilter: "saturate(0.95) contrast(1)",
    progressTrackOpacity: 0.32,
    frameTreatment: "none",
  },
  neon: {
    label: "Neon",
    description: "Centered title, stronger glow, and louder visualizer energy.",
    layout: "center-stage",
    visualizerVariant: "neon",
    introEnd: 0.85,
    titleStartY: 30,
    titleStartScale: 0.94,
    logoStart: 0.15,
    logoEnd: 0.9,
    overlayOpacity: 0.58,
    textShadow: "0 0 18px rgba(0, 255, 255, 0.75)",
    progressGlow: "0 0 18px currentColor",
    backgroundStartScale: 1.02,
    backgroundEndScale: 1.075,
    backgroundFilter: "saturate(1.35) contrast(1.12)",
    progressTrackOpacity: 0.22,
    frameTreatment: "none",
  },
  cinematic: {
    label: "Cinematic",
    description: "Film-style framing with slower motion and deeper contrast.",
    layout: "film-lower-left",
    visualizerVariant: "cinematic",
    introEnd: 1.55,
    titleStartY: 34,
    titleStartScale: 0.98,
    logoStart: 0.5,
    logoEnd: 1.8,
    overlayOpacity: 0.68,
    textShadow: "0 3px 18px rgba(0, 0, 0, 0.85)",
    progressGlow: "none",
    backgroundStartScale: 1.04,
    backgroundEndScale: 1.12,
    backgroundFilter: "saturate(0.82) contrast(1.18)",
    progressTrackOpacity: 0.24,
    frameTreatment: "letterbox",
  },
  editorial: {
    label: "Editorial Lower Third",
    description: "A solid black lower panel creates a structured editorial stage.",
    layout: "lower-left",
    visualizerVariant: "minimal",
    introEnd: 1.25,
    titleStartY: 22,
    titleStartScale: 0.97,
    logoStart: 0.35,
    logoEnd: 1.2,
    overlayOpacity: 0.34,
    textShadow: "0 2px 16px rgba(0, 0, 0, 0.72)",
    progressGlow: "none",
    backgroundStartScale: 1,
    backgroundEndScale: 1.025,
    backgroundFilter: "saturate(0.88) contrast(1.08) brightness(1.02)",
    progressTrackOpacity: 0.4,
    frameTreatment: "lower-panel",
  },
  dreamscape: {
    label: "Dreamscape Header",
    description: "A black upper panel contrasts soft color and floating motion.",
    layout: "center-stage",
    visualizerVariant: "ribbon",
    introEnd: 1.4,
    titleStartY: 26,
    titleStartScale: 0.92,
    logoStart: 0.25,
    logoEnd: 1.25,
    overlayOpacity: 0.46,
    textShadow: "0 0 28px rgba(255, 255, 255, 0.35)",
    progressGlow: "0 0 24px currentColor",
    backgroundStartScale: 1.025,
    backgroundEndScale: 1.095,
    backgroundFilter: "saturate(1.28) contrast(0.92) brightness(1.06)",
    progressTrackOpacity: 0.18,
    frameTreatment: "upper-panel",
  },
  monochrome: {
    label: "Monochrome Side Matte",
    description: "Black side mattes frame monochrome imagery in a narrower stage.",
    layout: "film-lower-left",
    visualizerVariant: "waveform",
    introEnd: 1,
    titleStartY: 20,
    titleStartScale: 1,
    logoStart: 0.3,
    logoEnd: 1.1,
    overlayOpacity: 0.5,
    textShadow: "0 3px 12px rgba(0, 0, 0, 0.9)",
    progressGlow: "none",
    backgroundStartScale: 1.01,
    backgroundEndScale: 1.045,
    backgroundFilter: "grayscale(1) contrast(1.24)",
    progressTrackOpacity: 0.34,
    frameTreatment: "side-matte",
  },
  retro: {
    label: "Retro Broadcast Frame",
    description: "A bold inset broadcast frame surrounds warm, energetic color.",
    layout: "lower-left",
    visualizerVariant: "stacked",
    introEnd: 0.75,
    titleStartY: 28,
    titleStartScale: 0.9,
    logoStart: 0.1,
    logoEnd: 0.8,
    overlayOpacity: 0.38,
    textShadow: "3px 3px 0 rgba(0, 0, 0, 0.72)",
    progressGlow: "0 0 10px currentColor",
    backgroundStartScale: 1.015,
    backgroundEndScale: 1.065,
    backgroundFilter: "sepia(0.22) saturate(1.3) contrast(1.1)",
    progressTrackOpacity: 0.28,
    frameTreatment: "broadcast-frame",
  },
};

export function getVideoThemePreset(theme: VideoTheme) {
  return VIDEO_THEME_PRESETS[theme];
}
