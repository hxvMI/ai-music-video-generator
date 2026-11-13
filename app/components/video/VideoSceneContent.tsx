"use client";

import type { CSSProperties } from "react";

import { useVideoEngine } from "../../hooks/useVideoEngine";
import { getActiveVideoCaption } from "../../lib/videoCaptions";
import { VIDEO_FONT_STACKS } from "../../lib/videoLayout";
import type { VideoThemeLayout, VisualizerVariant } from "../../lib/videoThemePresets";
import type {
  OverlayPosition,
  RemotionAssetUrls,
  VideoAudioAnalysis,
  VideoExportManifest,
} from "../../types/videoProject";

type VideoSceneContentProps = {
  metadata: VideoExportManifest["metadata"];
  style: VideoExportManifest["style"];
  audioAnalysis: VideoAudioAnalysis | null;
  assetUrls: RemotionAssetUrls;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const FRAME_TREATMENT_Z_INDEX = 10;
const OVERLAY_CONTENT_Z_INDEX = 30;

const titleStyles: Record<VideoThemeLayout, CSSProperties> = {
  "lower-left": {
    fontSize: 74,
    lineHeight: 1,
    fontWeight: 800,
  },
  "center-stage": {
    fontSize: 96,
    lineHeight: 0.95,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  "film-lower-left": {
    fontSize: 82,
    lineHeight: 1,
    fontWeight: 800,
  },
};

function getOverlayTextAlign(position: OverlayPosition) {
  if (position.endsWith("right")) return "right";
  if (position.endsWith("center") || position === "center") return "center";

  return "left";
}

function getOverlayTransformOrigin(position: OverlayPosition) {
  const horizontal = position.endsWith("right")
    ? "right"
    : position.endsWith("center") || position === "center"
      ? "center"
      : "left";
  const vertical = position.startsWith("top")
    ? "top"
    : position.startsWith("bottom")
      ? "bottom"
      : "center";

  return `${horizontal} ${vertical}`;
}

function getOverlayFrameStyle({
  position,
  offsetX,
  offsetY,
  width,
}: {
  position: OverlayPosition;
  offsetX: number;
  offsetY: number;
  width: number;
}): CSSProperties {
  const anchors: Record<
    OverlayPosition,
    { x: number; y: number; translateX: string; translateY: string }
  > = {
    "top-left": { x: 120, y: 100, translateX: "0", translateY: "0" },
    "top-center": { x: 960, y: 90, translateX: "-50%", translateY: "0" },
    "top-right": { x: 1800, y: 100, translateX: "-100%", translateY: "0" },
    "center-left": { x: 120, y: 540, translateX: "0", translateY: "-50%" },
    center: { x: 960, y: 540, translateX: "-50%", translateY: "-50%" },
    "center-right": {
      x: 1800,
      y: 540,
      translateX: "-100%",
      translateY: "-50%",
    },
    "bottom-left": { x: 120, y: 910, translateX: "0", translateY: "-100%" },
    "bottom-center": {
      x: 960,
      y: 930,
      translateX: "-50%",
      translateY: "-100%",
    },
    "bottom-right": {
      x: 1800,
      y: 910,
      translateX: "-100%",
      translateY: "-100%",
    },
  };
  const anchor = anchors[position];

  return {
    position: "absolute",
    left: anchor.x + offsetX,
    top: anchor.y + offsetY,
    width,
    maxWidth: STAGE_WIDTH - 240,
    transform: `translate(${anchor.translateX}, ${anchor.translateY})`,
    textAlign: getOverlayTextAlign(position),
  };
}

const visualizerSettings: Record<
  VisualizerVariant,
  {
    barCount: number;
    width: number;
    gap: number;
    minHeight: number;
    heightMultiplier: number;
    shadowBlur: number;
    mirrorFromCenter: boolean;
  }
> = {
  minimal: {
    barCount: 38,
    width: 8,
    gap: 7,
    minHeight: 12,
    heightMultiplier: 62,
    shadowBlur: 0,
    mirrorFromCenter: false,
  },
  neon: {
    barCount: 52,
    width: 7,
    gap: 6,
    minHeight: 18,
    heightMultiplier: 92,
    shadowBlur: 18,
    mirrorFromCenter: false,
  },
  cinematic: {
    barCount: 34,
    width: 10,
    gap: 9,
    minHeight: 8,
    heightMultiplier: 42,
    shadowBlur: 0,
    mirrorFromCenter: true,
  },
  waveform: {
    barCount: 60,
    width: 5,
    gap: 5,
    minHeight: 10,
    heightMultiplier: 46,
    shadowBlur: 8,
    mirrorFromCenter: true,
  },
  spectrum: {
    barCount: 70,
    width: 6,
    gap: 4,
    minHeight: 16,
    heightMultiplier: 118,
    shadowBlur: 20,
    mirrorFromCenter: false,
  },
  stacked: {
    barCount: 46,
    width: 12,
    gap: 6,
    minHeight: 20,
    heightMultiplier: 78,
    shadowBlur: 10,
    mirrorFromCenter: false,
  },
  radial: {
    barCount: 56,
    width: 5,
    gap: 0,
    minHeight: 14,
    heightMultiplier: 62,
    shadowBlur: 16,
    mirrorFromCenter: false,
  },
  ribbon: {
    barCount: 72,
    width: 4,
    gap: 4,
    minHeight: 8,
    heightMultiplier: 52,
    shadowBlur: 12,
    mirrorFromCenter: true,
  },
  cityscape: {
    barCount: 64,
    width: 10,
    gap: 4,
    minHeight: 18,
    heightMultiplier: 120,
    shadowBlur: 16,
    mirrorFromCenter: false,
  },
};

function SceneVisualizer({
  color,
  currentTime,
  variant,
  intensity,
  onset,
  horizontalAlignment,
}: {
  color: string;
  currentTime: number;
  variant: VisualizerVariant;
  intensity: number;
  onset: number;
  horizontalAlignment: "flex-start" | "center" | "flex-end";
}) {
  const settings = visualizerSettings[variant];
  const frameLikeTime = currentTime * 30;
  const energy = 0.55 + intensity + onset * 0.45;

  if (variant === "waveform" || variant === "ribbon") {
    const points = Array.from({ length: 49 }, (_, index) => {
      const x = (index / 48) * 1180;
      const envelope = variant === "waveform" ? 1 : 0.72 + Math.sin(index * 0.19) * 0.18;
      const y = 90 + Math.sin(frameLikeTime * 0.13 + index * 0.5) * 45 * energy * envelope;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox="0 0 1180 180" width="100%" height="180" overflow="visible">
        {variant === "ribbon" ? (
          <>
            <polyline points={points} fill="none" stroke={color} strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" opacity="0.18" />
            <polyline points={points} fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.42" />
            <polyline points={points} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
          </>
        ) : (
          <>
            <line x1="0" y1="90" x2="1180" y2="90" stroke={color} strokeWidth="2" opacity="0.24" />
            <polyline points={points} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 9px ${color})` }} />
          </>
        )}
      </svg>
    );
  }

  if (variant === "stacked") {
    return (
      <div style={{ display: "flex", alignItems: "end", gap: 8, height: 150, justifyContent: horizontalAlignment, width: "100%" }}>
        {Array.from({ length: 32 }, (_, column) => {
          const activeSegments = Math.max(1, Math.round((3 + Math.abs(Math.sin(frameLikeTime * 0.12 + column * 0.48)) * 7) * energy));
          return (
            <div key={column} style={{ display: "flex", flexDirection: "column-reverse", gap: 4 }}>
              {Array.from({ length: Math.min(activeSegments, 12) }, (_, segment) => (
                <div key={segment} style={{ width: 18, height: 7, borderRadius: 2, backgroundColor: color, opacity: 0.45 + segment * 0.045 }} />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "cityscape") {
    return (
      <div style={{ display: "flex", alignItems: "end", gap: 5, height: 190, justifyContent: horizontalAlignment, width: "100%", borderBottom: `5px solid ${color}` }}>
        {Array.from({ length: 38 }, (_, index) => {
          const height = 28 + Math.abs(Math.sin(index * 1.73 + frameLikeTime * 0.07)) * 125 * energy;
          return <div key={index} style={{ width: 22 + (index % 3) * 5, height, background: `linear-gradient(to top, ${color}, ${color}88)`, borderRadius: "3px 3px 0 0", boxShadow: index % 4 === 0 ? `0 0 16px ${color}` : "none" }} />;
        })}
      </div>
    );
  }
  if (variant === "radial") {
    const radialBars = Array.from({ length: settings.barCount }, (_, index) => {
      const wave = Math.sin(frameLikeTime * 0.16 + index * 0.42);
      const height =
        settings.minHeight +
        Math.abs(wave) *
          settings.heightMultiplier *
          (0.55 + intensity + onset * 0.45);

      return (
        <div
          key={index}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: settings.width,
            height,
            borderRadius: 999,
            backgroundColor: color,
            boxShadow: `0 0 ${settings.shadowBlur}px ${color}`,
            transform: `rotate(${
              (360 / settings.barCount) * index
            }deg) translateY(-92px)`,
            transformOrigin: "50% 0",
          }}
        />
      );
    });

    return (
      <div
        style={{
          height: 240,
          margin: "0 auto",
          position: "relative",
          width: 240,
        }}
      >
        {radialBars}
      </div>
    );
  }

  const bars = Array.from({ length: settings.barCount }, (_, index) => {
    // The live preview and Remotion render must use deterministic math here.
    // Live Web Audio bars look cool, but they cannot match an exported frame.
    const wave = Math.sin(frameLikeTime * 0.18 + index * 0.55);
    const height =
      settings.minHeight +
      Math.abs(wave) *
        settings.heightMultiplier *
        (0.55 + intensity + onset * 0.45);

    return (
      <div
        key={index}
        style={{
          width: settings.width,
          // CSS rounds long decimals; keep server and browser styles identical on hydration.
          height: Math.round(height * 1000) / 1000,
          borderRadius: 999,
          backgroundColor: color,
          boxShadow:
            settings.shadowBlur > 0
              ? `0 0 ${settings.shadowBlur}px ${color}`
              : "none",
        }}
      />
    );
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: settings.mirrorFromCenter ? "center" : "end",
        gap: settings.gap,
        height: settings.mirrorFromCenter ? 70 : 120,
        justifyContent: horizontalAlignment,
        width: "100%",
      }}
    >
      {bars}
    </div>
  );
}

export function VideoSceneContent({
  metadata,
  style,
  audioAnalysis,
  assetUrls,
  currentTime,
  duration,
  isPlaying,
}: VideoSceneContentProps) {
  const {
    progressPercent,
    formattedCurrentTime,
    formattedDuration,
    themePreset,
    animations,
    reactiveAudio,
    effectiveVisuals,
    themeStyles,
  } = useVideoEngine({
    currentTime,
    duration,
    isPlaying,
    theme: style.theme,
    visualMode: style.visualMode,
    visualizerPreset: style.visualizerPreset,
    cameraPreset: style.cameraPreset,
    effectPreset: style.effectPreset,
    randomSeed: style.randomSeed,
    reactiveTimeline: style.reactiveTimeline,
    audioAnalysis,
  });
  const layout = style.layout;
  const hasSongTitle =
    layout.showTitle && metadata.songTitle.trim().length > 0;
  const hasArtistName =
    layout.showArtist && metadata.artistName.trim().length > 0;
  const titleFrameStyle = getOverlayFrameStyle({
    position: layout.titlePosition,
    offsetX: layout.titleOffsetX,
    offsetY: layout.titleOffsetY,
    width: themePreset.layout === "center-stage" ? 1320 : 1120,
  });
  titleFrameStyle.transform = `${titleFrameStyle.transform ?? ""} rotate(${layout.titleRotation ?? 0}deg)`.trim();
  const logoFrameStyle = getOverlayFrameStyle({
    position: layout.logoPosition,
    offsetX: layout.logoOffsetX,
    offsetY: layout.logoOffsetY,
    width: layout.logoWidth,
  });
  logoFrameStyle.height = layout.logoHeight;
  logoFrameStyle.transform = `${logoFrameStyle.transform ?? ""} rotate(${layout.logoRotation}deg)`.trim();
  logoFrameStyle.transformOrigin = getOverlayTransformOrigin(layout.logoPosition);
  const progressFrameStyle = getOverlayFrameStyle({
    position: layout.progressPosition,
    offsetX: layout.progressOffsetX,
    offsetY: layout.progressOffsetY,
    width: layout.progressWidth,
  });
  progressFrameStyle.transform = `${progressFrameStyle.transform ?? ""} rotate(${layout.progressRotation ?? 0}deg)`.trim();
  const progressTimeFrameStyle = getOverlayFrameStyle({
    position: layout.progressTimePosition,
    offsetX: layout.progressTimeOffsetX,
    offsetY: layout.progressTimeOffsetY,
    width: 360,
  });
  progressTimeFrameStyle.transform = `${progressTimeFrameStyle.transform ?? ""} rotate(${layout.progressTimeRotation ?? 0}deg) scale(${layout.progressTimeScale})`.trim();
  progressTimeFrameStyle.transformOrigin = getOverlayTransformOrigin(
    layout.progressTimePosition
  );
  // Progress styles are plain CSS values so this branch renders identically in
  // the browser Player and Remotion's server-side Chromium renderer.
  const progressStyle = layout.progressStyle ?? "solid";
  const isMinimalProgress = progressStyle === "minimal";
  const isPulsingProgress = progressStyle === "pulse";
  const progressFillBackground =
    progressStyle === "gradient"
      ? `linear-gradient(90deg, ${style.visualizerColor}, white)`
      : progressStyle === "segmented"
        ? `repeating-linear-gradient(90deg, ${style.visualizerColor} 0 28px, transparent 28px 35px)`
        : style.visualizerColor;
  const activeCaption = getActiveVideoCaption({
    captions: style.captions,
    audioAnalysis,
    currentTime,
    duration,
  });
  const captionFrameStyle = getOverlayFrameStyle({
    position: style.captions.position,
    offsetX: style.captions.offsetX,
    offsetY: style.captions.offsetY,
    width: 1280,
  });
  captionFrameStyle.transform = `${captionFrameStyle.transform ?? ""} rotate(${style.captions.rotation ?? 0}deg)`.trim();

  return (
    <div
      style={{
        position: "relative",
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        overflow: "hidden",
        backgroundColor: "black",
        color: "white",
        fontFamily: VIDEO_FONT_STACKS[layout.fontFamily],
      }}
    >
      {layout.showBackground && assetUrls.backgroundUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("${assetUrls.backgroundUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `translate(${
              reactiveAudio.cameraTranslateX + layout.backgroundOffsetX
            }px, ${
              reactiveAudio.cameraTranslateY + layout.backgroundOffsetY
            }px) scale(${
              animations.backgroundScale *
              reactiveAudio.cameraScale *
              layout.backgroundScale
            })`,
            filter: themeStyles.backgroundFilter,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "black",
          opacity: themeStyles.overlayOpacity,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: reactiveAudio.glowOpacity,
          background: `radial-gradient(circle at 50% 55%, ${style.visualizerColor}55 0%, transparent 42%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "white",
          opacity: reactiveAudio.flashOpacity,
        }}
      />

      {reactiveAudio.vignetteOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: `inset 0 0 280px rgba(0, 0, 0, ${reactiveAudio.vignetteOpacity})`,
          }}
        />
      )}

      {themePreset.frameTreatment === "letterbox" && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "9%",
              backgroundColor: "black",
              zIndex: FRAME_TREATMENT_Z_INDEX,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "9%",
              backgroundColor: "black",
              zIndex: FRAME_TREATMENT_Z_INDEX,
            }}
          />
        </>
      )}

      {layout.showLogo && assetUrls.logoUrl && (
        <div
          style={{
            ...logoFrameStyle,
            zIndex: OVERLAY_CONTENT_Z_INDEX,
            backgroundImage: `url("${assetUrls.logoUrl}")`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: animations.logoOpacity * layout.logoOpacity,
          }}
        />
      )}

      {(hasSongTitle || hasArtistName) && (
        <div style={{ ...titleFrameStyle, zIndex: OVERLAY_CONTENT_Z_INDEX }}>
          <div
            style={{
              opacity: animations.titleOpacity,
              textShadow: themeStyles.textShadow,
              transform: `translateY(${animations.titleTranslateY}px) scale(${animations.titleScale})`,
            }}
          >
            {hasSongTitle && (
              <h1
                style={{
                  margin: 0,
                  ...titleStyles[themePreset.layout],
                }}
              >
                {metadata.songTitle}
              </h1>
            )}

            {hasArtistName && (
              <p
                style={{
                  marginTop: hasSongTitle ? 18 : 0,
                  marginBottom: 0,
                  fontSize: 34,
                }}
              >
                {metadata.artistName}
              </p>
            )}
          </div>
        </div>
      )}

      {activeCaption && (
        <div style={{ ...captionFrameStyle, zIndex: OVERLAY_CONTENT_Z_INDEX }}>
          <div
            style={{
              display: "inline-block",
              maxWidth: "100%",
              borderRadius: 18,
              padding: "14px 24px",
              backgroundColor:
                activeCaption.emphasis === "drop"
                  ? "rgba(239, 68, 68, 0.34)"
                  : "rgba(0, 0, 0, 0.36)",
              color: "white",
              fontSize:
                activeCaption.emphasis === "beat"
                  ? style.captions.fontSize * 0.86
                  : style.captions.fontSize,
              fontWeight: activeCaption.emphasis === "lyric" ? 800 : 900,
              letterSpacing: activeCaption.emphasis === "lyric" ? 0 : 2,
              lineHeight: 1.12,
              textShadow:
                "0 3px 20px rgba(0,0,0,0.92), 0 0 18px rgba(0,0,0,0.6)",
              textTransform:
                activeCaption.emphasis === "lyric" ? "none" : "uppercase",
              boxShadow:
                activeCaption.emphasis === "drop"
                  ? `0 0 42px ${style.visualizerColor}66`
                  : "none",
            }}
          >
            {activeCaption.text}
          </div>
        </div>
      )}

      {layout.visualizerLayers.filter((layer) => layer.enabled).map((layer) => {
        const horizontalAlignment = layer.position.endsWith("right")
          ? "flex-end"
          : layer.position.endsWith("center") || layer.position === "center"
            ? "center"
            : "flex-start";
        const frameStyle = getOverlayFrameStyle({
          position: layer.position,
          offsetX: layer.offsetX,
          offsetY: layer.offsetY,
          width: 1180,
        });

        return (
          <div
            key={layer.id}
            style={{ ...frameStyle, zIndex: OVERLAY_CONTENT_Z_INDEX }}
          >
            <div style={{ opacity: Math.max(animations.titleOpacity, 0.82) * layer.opacity, transform: `rotate(${layer.rotation ?? 0}deg) scale(${layer.scaleX}, ${layer.scaleY})`, transformOrigin: getOverlayTransformOrigin(layer.position) }}>
              <SceneVisualizer
                color={layer.color ?? style.visualizerColor}
                currentTime={currentTime}
                variant={layer.preset === "active" ? effectiveVisuals.visualizerPreset : layer.preset}
                intensity={Math.min(2.5, reactiveAudio.intensity * layer.reactivity)}
                onset={Math.min(2.5, reactiveAudio.onset * layer.reactivity)}
                horizontalAlignment={horizontalAlignment}
              />
            </div>
          </div>
        );
      })}

      {layout.showProgress && (
        <div style={{ ...progressFrameStyle, zIndex: OVERLAY_CONTENT_Z_INDEX }}>
          <div
            style={{
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                height: layout.progressHeight ?? 12,
                borderRadius: isMinimalProgress ? 0 : 999,
                backgroundColor: `rgba(255,255,255,${themeStyles.progressTrackOpacity})`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  borderRadius: isMinimalProgress ? 0 : 999,
                  background: progressFillBackground,
                  opacity: isPulsingProgress ? 0.78 + Math.sin(currentTime * 5) * 0.22 : 1,
                  boxShadow:
                    progressStyle === "glow" || isPulsingProgress
                      ? `0 0 ${Math.max(14, (layout.progressHeight ?? 12) * 1.8)}px ${style.visualizerColor}`
                      : themeStyles.progressGlow,
                }}
              />
            </div>

          </div>
        </div>
      )}

      {themePreset.frameTreatment === "side-matte" && (
        <>
          <div style={{ position: "absolute", inset: "0 auto 0 0", width: "12%", backgroundColor: "black", zIndex: FRAME_TREATMENT_Z_INDEX }} />
          <div style={{ position: "absolute", inset: "0 0 0 auto", width: "12%", backgroundColor: "black", zIndex: FRAME_TREATMENT_Z_INDEX }} />
        </>
      )}

      {themePreset.frameTreatment === "lower-panel" && (
        <div style={{ position: "absolute", inset: "70% 0 0", backgroundColor: "rgba(0, 0, 0, 0.94)", zIndex: FRAME_TREATMENT_Z_INDEX }} />
      )}

      {themePreset.frameTreatment === "upper-panel" && (
        <div style={{ position: "absolute", inset: "0 0 70%", backgroundColor: "rgba(0, 0, 0, 0.94)", zIndex: FRAME_TREATMENT_Z_INDEX }} />
      )}

      {themePreset.frameTreatment === "broadcast-frame" && (
        <div style={{ position: "absolute", inset: 24, border: "18px solid rgba(0, 0, 0, 0.9)", boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.32)", zIndex: FRAME_TREATMENT_Z_INDEX }} />
      )}

      {layout.showProgressTime && (
        <div style={{ ...progressTimeFrameStyle, zIndex: OVERLAY_CONTENT_Z_INDEX }}>
          <p style={{ margin: 0, fontSize: 26, fontVariantNumeric: "tabular-nums" }}>
            {formattedCurrentTime} / {formattedDuration}
          </p>
        </div>
      )}
    </div>
  );
}
