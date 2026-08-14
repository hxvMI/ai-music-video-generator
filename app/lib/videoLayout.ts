import type { OverlayPosition, VideoLayoutConfig, VisualizerLayer } from "@/types/videoProject";

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
  backgroundScale: 1,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,
  titlePosition: "bottom-left",
  titleOffsetX: 0,
  titleOffsetY: 0,
  titleRotation: 0,
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
    normalizedLayout.backgroundScale === DEFAULT_VIDEO_LAYOUT.backgroundScale &&
    normalizedLayout.backgroundOffsetX === DEFAULT_VIDEO_LAYOUT.backgroundOffsetX &&
    normalizedLayout.backgroundOffsetY === DEFAULT_VIDEO_LAYOUT.backgroundOffsetY &&
    normalizedLayout.titlePosition === DEFAULT_VIDEO_LAYOUT.titlePosition &&
    normalizedLayout.titleOffsetX === DEFAULT_VIDEO_LAYOUT.titleOffsetX &&
    normalizedLayout.titleOffsetY === DEFAULT_VIDEO_LAYOUT.titleOffsetY &&
    normalizedLayout.titleRotation === DEFAULT_VIDEO_LAYOUT.titleRotation &&
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
  );
}
