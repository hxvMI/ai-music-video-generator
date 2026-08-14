import {
  DEFAULT_BACKGROUND_PROMPT,
  DEFAULT_BACKGROUND_PRESET_ID,
} from "@/lib/backgroundStudio";
import { DEFAULT_VIDEO_CAPTIONS } from "@/lib/videoCaptions";
import { DEFAULT_VIDEO_LAYOUT, DEFAULT_VISUALIZER_LAYER } from "@/lib/videoLayout";
import type {
  BackgroundPresetId,
  BackgroundPromptFields,
  CameraPreset,
  EffectPreset,
  VideoAudioAnalysis,
  VideoCaptionConfig,
  VideoLayoutConfig,
  VideoTheme,
  VisualMode,
  VisualizerPreset,
} from "@/types/videoProject";

type TrackInfo = {
  songTitle: string;
  artistName: string;
};

export type AutoCreatorSetup = {
  trackInfo: TrackInfo;
  background: {
    presetId: BackgroundPresetId;
    prompt: BackgroundPromptFields;
  };
  style: {
    theme: VideoTheme;
    visualMode: VisualMode;
    visualizerColor: string;
    visualizerPreset: VisualizerPreset;
    cameraPreset: CameraPreset;
    effectPreset: EffectPreset;
    randomSeed: number;
    layout: VideoLayoutConfig;
    captions: VideoCaptionConfig;
  };
  summary: string;
};

const extensionPattern = /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i;

function cleanWord(value: string) {
  return value
    .replace(extensionPattern, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return cleanWord(value)
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word.length <= 3 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export function parseTrackInfoFromFileName(fileName: string): TrackInfo {
  const cleanedName = cleanWord(fileName);
  const separatedMatch = cleanedName.match(
    /^(.+?)\s+(?:-|\u2013|\u2014|by)\s+(.+)$/i
  );

  if (!separatedMatch) {
    return {
      songTitle: titleCase(cleanedName),
      artistName: "",
    };
  }

  return {
    songTitle: titleCase(separatedMatch[2] || cleanedName),
    artistName: titleCase(separatedMatch[1] || ""),
  };
}

function includesAny(value: string, keywords: string[]) {
  const lowerValue = value.toLowerCase();

  return keywords.some((keyword) => lowerValue.includes(keyword));
}

function normalizeLyricsForCaptions(lyricsText: string) {
  const trimmedText = lyricsText.trim();

  if (!trimmedText) return "";

  const existingLines = trimmedText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (existingLines.length > 1) {
    return existingLines.slice(0, 48).join("\n");
  }

  const sentenceLines = trimmedText
    .split(/(?<=[.!?])\s+/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (sentenceLines.length > 1) {
    return sentenceLines.slice(0, 48).join("\n");
  }

  const words = trimmedText.split(/\s+/g).filter(Boolean);
  const lines: string[] = [];

  for (let index = 0; index < words.length; index += 8) {
    lines.push(words.slice(index, index + 8).join(" "));
  }

  return lines.slice(0, 48).join("\n");
}

function getAnalysisProfile(audioAnalysis: VideoAudioAnalysis) {
  const dropDensity =
    audioAnalysis.summary.dropCount /
    Math.max(audioAnalysis.durationSeconds / 60, 0.25);
  const isEnergetic =
    audioAnalysis.summary.peakEnergy > 0.82 ||
    audioAnalysis.summary.averageEnergy > 0.62 ||
    dropDensity >= 7;
  const isCalm =
    audioAnalysis.summary.averageEnergy < 0.34 && dropDensity < 3;

  return {
    dropDensity,
    isEnergetic,
    isCalm,
  };
}

function buildPromptFromMood({
  fileName,
  lyricsText,
  audioAnalysis,
}: {
  fileName: string;
  lyricsText: string;
  audioAnalysis: VideoAudioAnalysis;
}) {
  const profile = getAnalysisProfile(audioAnalysis);
  const sourceText = `${fileName} ${lyricsText}`.trim();
  const isRomantic = includesAny(sourceText, [
    "love",
    "heart",
    "baby",
    "kiss",
    "darling",
  ]);
  const isDark = includesAny(sourceText, [
    "night",
    "dark",
    "lost",
    "ghost",
    "pain",
    "alone",
    "sad",
  ]);
  const isDreamy = includesAny(sourceText, [
    "dream",
    "moon",
    "sky",
    "ocean",
    "float",
    "stars",
  ]);

  if (profile.isEnergetic) {
    return {
      presetId: "neon-stage" as const,
      prompt: {
        mood: isDark
          ? "intense, nocturnal, and dramatic"
          : "high-energy and electric",
        scene:
          "wide concert stage, abstract light beams, and reactive music energy",
        colorDirection: isRomantic
          ? "magenta, cyan, and deep violet"
          : "cyan, purple, and electric blue",
        avoid: DEFAULT_BACKGROUND_PROMPT.avoid,
      },
    };
  }

  if (profile.isCalm || isDreamy) {
    return {
      presetId: "soft-lofi" as const,
      prompt: {
        mood: isRomantic
          ? "warm, intimate, and dreamy"
          : "soft, reflective, and atmospheric",
        scene:
          "cinematic abstract landscape with calm depth and open negative space",
        colorDirection: isDark
          ? "midnight blue, muted teal, and warm amber"
          : "soft teal, muted peach, and moonlit blue",
        avoid: DEFAULT_BACKGROUND_PROMPT.avoid,
      },
    };
  }

  if (isDark) {
    return {
      presetId: "cinematic-dark" as const,
      prompt: {
        mood: "cinematic, moody, and polished",
        scene: "dark atmospheric stage with subtle haze and a controlled glow",
        colorDirection: "charcoal, gold, and deep blue",
        avoid: DEFAULT_BACKGROUND_PROMPT.avoid,
      },
    };
  }

  return {
    presetId: DEFAULT_BACKGROUND_PRESET_ID,
    prompt: DEFAULT_BACKGROUND_PROMPT,
  };
}

export function buildAutoCreatorSetup({
  fileName,
  audioAnalysis,
  lyricsText,
}: {
  fileName: string;
  audioAnalysis: VideoAudioAnalysis;
  lyricsText: string;
}): AutoCreatorSetup {
  const trackInfo = parseTrackInfoFromFileName(fileName);
  const profile = getAnalysisProfile(audioAnalysis);
  const background = buildPromptFromMood({
    fileName,
    lyricsText,
    audioAnalysis,
  });
  const hasLyrics = lyricsText.trim().length > 0;
  const captionLyrics = normalizeLyricsForCaptions(lyricsText);
  const visualizerColor = profile.isEnergetic
    ? "#00E5FF"
    : profile.isCalm
      ? "#F4D35E"
      : "#00FFFF";
  const visualizerPreset: VisualizerPreset = profile.isEnergetic
    ? "cityscape"
    : profile.isCalm
      ? "cinematic"
      : "waveform";
  const cameraPreset: CameraPreset = profile.isEnergetic
    ? "pulse"
    : profile.isCalm
      ? "drift"
      : "float";
  const effectPreset: EffectPreset = profile.isEnergetic
    ? "flash"
    : profile.isCalm
      ? "vignette"
      : "glow";
  const layout: VideoLayoutConfig = {
    ...DEFAULT_VIDEO_LAYOUT,
    backgroundScale: profile.isEnergetic ? 1.12 : profile.isCalm ? 1.04 : 1.08,
    titlePosition: hasLyrics ? "top-left" : "bottom-left",
    visualizerPosition: hasLyrics ? "bottom-center" : "bottom-left",
    visualizerOffsetY: hasLyrics ? -20 : 0,
    visualizerLayers: [
      {
        ...DEFAULT_VISUALIZER_LAYER,
        position: hasLyrics ? "bottom-center" : "bottom-left",
        offsetY: hasLyrics ? -20 : 0,
      },
    ],
    progressPosition: "bottom-left",
    progressOffsetY: hasLyrics ? 80 : 0,
    showProgress: !hasLyrics,
  };
  const captions: VideoCaptionConfig = hasLyrics
    ? {
        ...DEFAULT_VIDEO_CAPTIONS,
        mode: "lyrics",
        lyricsText: captionLyrics,
        position: "bottom-center",
      }
    : {
        ...DEFAULT_VIDEO_CAPTIONS,
        mode: "beat",
        position: "center",
        fontSize: profile.isEnergetic ? 64 : 48,
      };

  return {
    trackInfo,
    background,
    style: {
      theme: profile.isEnergetic ? "neon" : profile.isCalm ? "cinematic" : "minimal",
      visualMode: "auto" satisfies VisualMode,
      visualizerColor,
      visualizerPreset,
      cameraPreset,
      effectPreset,
      randomSeed: Math.max(Math.round(audioAnalysis.durationSeconds * 1000), 1),
      layout,
      captions,
    },
    summary: profile.isEnergetic
      ? "Auto Director chose an energetic neon setup with lyric-aware captions."
      : profile.isCalm
        ? "Auto Director chose a calm cinematic setup with restrained movement."
        : "Auto Director chose a balanced visualizer setup for this track.",
  };
}
