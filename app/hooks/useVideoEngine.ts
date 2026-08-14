//Controls:
// progress
// timestamps
// animation state
// sync rules

"use client";

import { useMemo } from "react";
import {
  getActiveReactiveZone,
  getReactiveZoneIntensity,
} from "../lib/reactiveArrangement";
import { resolveVisualPresets } from "../lib/visualPresetSelection";
import { getVideoThemePreset } from "../lib/videoThemePresets";
import type {
  CameraPreset,
  EffectPreset,
  ReactiveTimeline,
  VideoAudioAnalysis,
  VideoTheme,
  VisualMode,
  VisualizerPreset,
} from "../types/videoProject";

type VideoEngineParams = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  theme: VideoTheme;
  visualMode: VisualMode;
  visualizerPreset: VisualizerPreset;
  cameraPreset: CameraPreset;
  effectPreset: EffectPreset;
  randomSeed: number;
  reactiveTimeline: ReactiveTimeline;
  audioAnalysis?: VideoAudioAnalysis | null;
};

const cameraPresetSettings: Record<
  CameraPreset,
  {
    zoomStrength: number;
    panStrengthX: number;
    panStrengthY: number;
    dropShake: number;
  }
> = {
  locked: {
    zoomStrength: 0,
    panStrengthX: 0,
    panStrengthY: 0,
    dropShake: 0,
  },
  steady: {
    zoomStrength: 0.016,
    panStrengthX: 2,
    panStrengthY: 1,
    dropShake: 0,
  },
  float: {
    zoomStrength: 0.032,
    panStrengthX: 8,
    panStrengthY: 5,
    dropShake: 2,
  },
  drift: {
    zoomStrength: 0.024,
    panStrengthX: 12,
    panStrengthY: 7,
    dropShake: 1,
  },
  pulse: {
    zoomStrength: 0.058,
    panStrengthX: 10,
    panStrengthY: 7,
    dropShake: 7,
  },
  shake: {
    zoomStrength: 0.07,
    panStrengthX: 13,
    panStrengthY: 9,
    dropShake: 12,
  },
};

const effectPresetSettings: Record<
  EffectPreset,
  {
    flashStrength: number;
    glowBase: number;
    glowStrength: number;
    vignetteOpacity: number;
  }
> = {
  none: {
    flashStrength: 0,
    glowBase: 0,
    glowStrength: 0,
    vignetteOpacity: 0,
  },
  clean: {
    flashStrength: 0.04,
    glowBase: 0.02,
    glowStrength: 0.14,
    vignetteOpacity: 0,
  },
  glow: {
    flashStrength: 0.08,
    glowBase: 0.08,
    glowStrength: 0.34,
    vignetteOpacity: 0,
  },
  flash: {
    flashStrength: 0.18,
    glowBase: 0.06,
    glowStrength: 0.3,
    vignetteOpacity: 0,
  },
  strobe: {
    flashStrength: 0.26,
    glowBase: 0.05,
    glowStrength: 0.26,
    vignetteOpacity: 0,
  },
  vignette: {
    flashStrength: 0.03,
    glowBase: 0.02,
    glowStrength: 0.12,
    vignetteOpacity: 0.42,
  },
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

//Forces number to stay in safe range
function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

//Tells us how far an animation is between 2 times
function getProgressBetween(currentTime: number, startTime: number, endTime: number){
    if(endTime <= startTime) return 1;

    const rawProgress = (currentTime - startTime) / (endTime - startTime);

    return clamp(rawProgress, 0, 1);
}

//Linear Interpolation moving between 2 numbers
//Useful for slide animations
function lerp(start: number, end: number, progress: number){
    return start + (end - start) * progress;
}

function getAnalysisPointAtTime(
  audioAnalysis: VideoAudioAnalysis | null | undefined,
  currentTime: number
) {
  const points = audioAnalysis?.points;

  if (!points || points.length === 0) {
    return {
      energy: 0.42,
      onset: 0,
      isDrop: false,
    };
  }

  const pointIndex = clamp(
    Math.floor(currentTime / Math.max(audioAnalysis.hopSeconds, 0.01)),
    0,
    points.length - 1
  );
  const point = points[pointIndex];
  const isDrop =
    audioAnalysis.dropTimes.some((dropTime) => Math.abs(currentTime - dropTime) < 0.12) ||
    point.onset > 0.86;

  return {
    energy: point.energy,
    onset: point.onset,
    isDrop,
  };
}

function getReactiveIntensity({
  currentTime,
  duration,
  energy,
  onset,
  isDrop,
}: {
  currentTime: number;
  duration: number;
  energy: number;
  onset: number;
  isDrop: boolean;
}) {
  const songProgress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const build = songProgress;
  const climax = songProgress > 0.75 ? 1 : songProgress / 0.75;
  const dropBoost = isDrop ? 0.18 : 0;

  return clamp(energy * 0.55 + onset * 0.25 + build * 0.12 + climax * 0.08 + dropBoost, 0, 1);
}

export function useVideoEngine({
  currentTime,
  duration,
  isPlaying,
  theme,
  visualMode,
  visualizerPreset,
  cameraPreset,
  effectPreset,
  randomSeed,
  reactiveTimeline,
  audioAnalysis,
}: VideoEngineParams) {
  const themePreset = useMemo(() => {
    return getVideoThemePreset(theme);
  }, [theme]);
  const activeReactiveZone = useMemo(() => {
    if (visualMode !== "auto") return null;

    return getActiveReactiveZone(reactiveTimeline.zones, currentTime);
  }, [currentTime, reactiveTimeline.zones, visualMode]);
  const effectiveVisuals = useMemo(() => {
    const resolvedPresets = resolveVisualPresets({
      style: {
        visualMode,
        visualizerPreset,
        cameraPreset,
        effectPreset,
        randomSeed,
      },
      audioAnalysis: audioAnalysis ?? null,
    });

    if (!activeReactiveZone) return resolvedPresets;

    return {
      visualizerPreset: activeReactiveZone.visualizerPreset,
      cameraPreset: activeReactiveZone.cameraPreset,
      effectPreset: activeReactiveZone.effectPreset,
      reason: `${activeReactiveZone.kind} arrangement zone is active.`,
    };
  }, [
    activeReactiveZone,
    audioAnalysis,
    cameraPreset,
    effectPreset,
    randomSeed,
    visualMode,
    visualizerPreset,
  ]);

  const progressPercent = useMemo(() => {
    if (duration <= 0) return 0;

    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const introProgress = useMemo(() => {
  return getProgressBetween(currentTime, 0, themePreset.introEnd);
}, [currentTime, themePreset.introEnd]);

const titleOpacity = introProgress;

const titleTranslateY = useMemo(() => {
  return lerp(themePreset.titleStartY, 0, introProgress);
}, [introProgress, themePreset.titleStartY]);

const titleScale = useMemo(() => {
  return lerp(themePreset.titleStartScale, 1, introProgress);
}, [introProgress, themePreset.titleStartScale]);

const logoOpacity = useMemo(() => {
  return getProgressBetween(currentTime, themePreset.logoStart, themePreset.logoEnd);
}, [currentTime, themePreset.logoStart, themePreset.logoEnd]);

const backgroundProgress = useMemo(() => {
  if (!isPlaying || duration <= 0) return 0;

  return clamp(currentTime / duration, 0, 1);
}, [currentTime, duration, isPlaying]);

const backgroundScale = useMemo(() => {
  return lerp(
    themePreset.backgroundStartScale,
    themePreset.backgroundEndScale,
    backgroundProgress
  );
}, [
  backgroundProgress,
  themePreset.backgroundEndScale,
  themePreset.backgroundStartScale,
]);

const reactiveAudio = useMemo(() => {
  const audioPoint = getAnalysisPointAtTime(audioAnalysis, currentTime);
  const cameraSettings = cameraPresetSettings[effectiveVisuals.cameraPreset];
  const effectSettings = effectPresetSettings[effectiveVisuals.effectPreset];
  const zoneIntensity =
    visualMode === "auto"
      ? getReactiveZoneIntensity(reactiveTimeline.zones, currentTime)
      : 1;
  const intensity = getReactiveIntensity({
    currentTime,
    duration,
    energy: audioPoint.energy,
    onset: audioPoint.onset,
    isDrop: audioPoint.isDrop,
  }) * zoneIntensity;
  const cameraBeat =
    clamp(audioPoint.energy + audioPoint.onset * 0.45, 0, 2.25) *
    zoneIntensity;
  const reactiveZoom = clamp(
    cameraBeat * cameraSettings.zoomStrength +
      (audioPoint.isDrop ? cameraSettings.zoomStrength * 0.65 : 0),
    0,
    0.105
  );
  const panX =
    Math.sin(currentTime * 2.7) * cameraBeat * cameraSettings.panStrengthX +
    (audioPoint.isDrop
      ? Math.sin(currentTime * 33) * cameraSettings.dropShake
      : 0);
  const panY =
    Math.cos(currentTime * 2.1) * cameraBeat * cameraSettings.panStrengthY +
    (audioPoint.isDrop
      ? Math.cos(currentTime * 29) * cameraSettings.dropShake
      : 0);

  // LESSON CHECKPOINT:
  // This mirrors B.A.R.D.'s camera zones idea: audio can push the background
  // and effects, but the title/UI layer stays locked and readable.
  return {
    energy: audioPoint.energy,
    onset: audioPoint.onset,
    isDrop: audioPoint.isDrop,
    intensity,
    cameraScale: 1 + reactiveZoom,
    cameraTranslateX: panX,
    cameraTranslateY: panY,
    flashOpacity: audioPoint.isDrop
      ? effectSettings.flashStrength * zoneIntensity
      : clamp(
          audioPoint.onset *
            effectSettings.flashStrength *
            0.55 *
            zoneIntensity,
          0,
          0.08
        ),
    glowOpacity: clamp(
      effectSettings.glowBase + intensity * effectSettings.glowStrength,
      0,
      0.4
    ),
    vignetteOpacity: effectSettings.vignetteOpacity * zoneIntensity,
  };
}, [
  audioAnalysis,
  currentTime,
  duration,
  effectiveVisuals.cameraPreset,
  effectiveVisuals.effectPreset,
  reactiveTimeline.zones,
  visualMode,
]);

return {
  themePreset,
  progressPercent,
  formattedCurrentTime: formatTime(currentTime),
  formattedDuration: formatTime(duration),
  timeline: {currentTime, duration, isPlaying,},
  animations: {introProgress, titleOpacity, titleTranslateY, titleScale, logoOpacity, backgroundScale,},
  reactiveAudio,
  activeReactiveZone,
  effectiveVisuals,
  themeStyles: {
    overlayOpacity: themePreset.overlayOpacity,
    textShadow: themePreset.textShadow,
    progressGlow: themePreset.progressGlow,
    backgroundFilter: themePreset.backgroundFilter,
    progressTrackOpacity: themePreset.progressTrackOpacity,
  },
};
}
