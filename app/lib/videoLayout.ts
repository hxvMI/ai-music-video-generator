import type {
  OverlayPosition,
  VideoFontFamily,
  VideoLayoutConfig,
  VisualizerLayer,
} from "@/types/videoProject";

export const VIDEO_FONT_OPTIONS: Array<{
  value: VideoFontFamily;
  label: string;
}> = [
  { value: "sans", label: "Modern Sans" },
  { value: "serif", label: "Editorial Serif" },
  { value: "mono", label: "Monospace" },
  { value: "condensed", label: "Condensed" },
  { value: "rounded", label: "Rounded" },
];

export const VIDEO_FONT_STACKS: Record<VideoFontFamily, string> = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
  condensed: "'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",
  rounded: "'Trebuchet MS', 'Arial Rounded MT Bold', Arial, sans-serif",
};

export const DEFAULT_VISUALIZER_LAYER: VisualizerLayer = {
  id: "visualizer-primary",
  name: "Primary visualizer",
  enabled: true,
  preset: "active",
  color: null,
  position: "bottom-left",
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
  reactivity: 1,
};

export const DEFAULT_VIDEO_LAYOUT: VideoLayoutConfig = {
  showBackground: true,
  backgroundScale: 1,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,
  fontFamily: "sans",
  showTitle: true,
  showArtist: true,
  titlePosition: "bottom-left",
  titleOffsetX: 0,
  titleOffsetY: 0,
  titleRotation: 0,
  showLogo: true,
  logoPosition: "top-right",
  logoOffsetX: 0,
  logoOffsetY: 0,
  logoWidth: 180,
  logoHeight: 180,
  logoRotation: 0,
  logoOpacity: 1,
  visualizerPosition: "bottom-left",
  visualizerOffsetX: 0,
  visualizerOffsetY: 0,
  visualizerScaleX: 1,
  visualizerScaleY: 1,
  visualizerLayers: [DEFAULT_VISUALIZER_LAYER],
  showProgress: true,
  progressPosition: "bottom-left",
  progressOffsetX: 0,
  progressOffsetY: 0,
  progressWidth: 1180,
  progressHeight: 12,
  progressStyle: "solid",
  progressRotation: 0,
  showProgressTime: true,
  progressTimePosition: "bottom-right",
  progressTimeOffsetX: 0,
  progressTimeOffsetY: 0,
  progressTimeRotation: 0,
  progressTimeScale: 1,
};

export const OVERLAY_POSITION_OPTIONS: {
  value: OverlayPosition;
  label: string;
}[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "center-left", label: "Center left" },
  { value: "center", label: "Center" },
  { value: "center-right", label: "Center right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

export function normalizeVideoLayout(
  layout: Partial<VideoLayoutConfig> | null | undefined
): VideoLayoutConfig {
  // Saved profiles can outlive individual controls. Defaults added here let
  // older JSON projects gain new layout fields without a migration screen.
  const legacyLayer: VisualizerLayer = {
    ...DEFAULT_VISUALIZER_LAYER,
    position: layout?.visualizerPosition ?? DEFAULT_VIDEO_LAYOUT.visualizerPosition,
    offsetX: layout?.visualizerOffsetX ?? DEFAULT_VIDEO_LAYOUT.visualizerOffsetX,
    offsetY: layout?.visualizerOffsetY ?? DEFAULT_VIDEO_LAYOUT.visualizerOffsetY,
    scaleX: layout?.visualizerScaleX ?? DEFAULT_VIDEO_LAYOUT.visualizerScaleX,
    scaleY: layout?.visualizerScaleY ?? DEFAULT_VIDEO_LAYOUT.visualizerScaleY,
  };

  return {
    ...DEFAULT_VIDEO_LAYOUT,
    ...layout,
    visualizerLayers: layout?.visualizerLayers?.length
      ? layout.visualizerLayers.slice(0, 4).map((layer) => ({
          ...DEFAULT_VISUALIZER_LAYER,
          ...layer,
        }))
      : [legacyLayer],
  };
}

export function isDefaultVideoLayout(layout: VideoLayoutConfig) {
  const normalizedLayout = normalizeVideoLayout(layout);

  return (
    normalizedLayout.showBackground === DEFAULT_VIDEO_LAYOUT.showBackground &&
    normalizedLayout.backgroundScale === DEFAULT_VIDEO_LAYOUT.backgroundScale &&
    normalizedLayout.backgroundOffsetX === DEFAULT_VIDEO_LAYOUT.backgroundOffsetX &&
    normalizedLayout.backgroundOffsetY === DEFAULT_VIDEO_LAYOUT.backgroundOffsetY &&
    normalizedLayout.fontFamily === DEFAULT_VIDEO_LAYOUT.fontFamily &&
    normalizedLayout.showTitle === DEFAULT_VIDEO_LAYOUT.showTitle &&
    normalizedLayout.showArtist === DEFAULT_VIDEO_LAYOUT.showArtist &&
    normalizedLayout.titlePosition === DEFAULT_VIDEO_LAYOUT.titlePosition &&
    normalizedLayout.titleOffsetX === DEFAULT_VIDEO_LAYOUT.titleOffsetX &&
    normalizedLayout.titleOffsetY === DEFAULT_VIDEO_LAYOUT.titleOffsetY &&
    normalizedLayout.titleRotation === DEFAULT_VIDEO_LAYOUT.titleRotation &&
    normalizedLayout.showLogo === DEFAULT_VIDEO_LAYOUT.showLogo &&
    normalizedLayout.logoPosition === DEFAULT_VIDEO_LAYOUT.logoPosition &&
    normalizedLayout.logoOffsetX === DEFAULT_VIDEO_LAYOUT.logoOffsetX &&
    normalizedLayout.logoOffsetY === DEFAULT_VIDEO_LAYOUT.logoOffsetY &&
    normalizedLayout.logoWidth === DEFAULT_VIDEO_LAYOUT.logoWidth &&
    normalizedLayout.logoHeight === DEFAULT_VIDEO_LAYOUT.logoHeight &&
    normalizedLayout.logoRotation === DEFAULT_VIDEO_LAYOUT.logoRotation &&
    normalizedLayout.logoOpacity === DEFAULT_VIDEO_LAYOUT.logoOpacity &&
    normalizedLayout.visualizerPosition === DEFAULT_VIDEO_LAYOUT.visualizerPosition &&
    normalizedLayout.visualizerOffsetX === DEFAULT_VIDEO_LAYOUT.visualizerOffsetX &&
    normalizedLayout.visualizerOffsetY === DEFAULT_VIDEO_LAYOUT.visualizerOffsetY &&
    normalizedLayout.visualizerScaleX === DEFAULT_VIDEO_LAYOUT.visualizerScaleX &&
    normalizedLayout.visualizerScaleY === DEFAULT_VIDEO_LAYOUT.visualizerScaleY &&
    JSON.stringify(normalizedLayout.visualizerLayers) ===
      JSON.stringify(DEFAULT_VIDEO_LAYOUT.visualizerLayers) &&
    normalizedLayout.showProgress === DEFAULT_VIDEO_LAYOUT.showProgress &&
    normalizedLayout.progressPosition === DEFAULT_VIDEO_LAYOUT.progressPosition &&
    normalizedLayout.progressOffsetX === DEFAULT_VIDEO_LAYOUT.progressOffsetX &&
    normalizedLayout.progressOffsetY === DEFAULT_VIDEO_LAYOUT.progressOffsetY &&
    normalizedLayout.progressWidth === DEFAULT_VIDEO_LAYOUT.progressWidth
    && normalizedLayout.progressHeight === DEFAULT_VIDEO_LAYOUT.progressHeight
    && normalizedLayout.progressStyle === DEFAULT_VIDEO_LAYOUT.progressStyle
    && normalizedLayout.progressRotation === DEFAULT_VIDEO_LAYOUT.progressRotation
    && normalizedLayout.showProgressTime === DEFAULT_VIDEO_LAYOUT.showProgressTime
    && normalizedLayout.progressTimePosition === DEFAULT_VIDEO_LAYOUT.progressTimePosition
    && normalizedLayout.progressTimeOffsetX === DEFAULT_VIDEO_LAYOUT.progressTimeOffsetX
    && normalizedLayout.progressTimeOffsetY === DEFAULT_VIDEO_LAYOUT.progressTimeOffsetY
    && normalizedLayout.progressTimeRotation === DEFAULT_VIDEO_LAYOUT.progressTimeRotation
    && normalizedLayout.progressTimeScale === DEFAULT_VIDEO_LAYOUT.progressTimeScale
  );
}
