import type {
  VideoAudioAnalysis,
  VideoCaptionConfig,
} from "@/types/videoProject";

export const DEFAULT_VIDEO_CAPTIONS: VideoCaptionConfig = {
  mode: "off",
  lyricsText: "",
  position: "bottom-center",
  offsetX: 0,
  offsetY: -80,
  fontSize: 48,
  rotation: 0,
  showBeatDrops: true,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function isDefaultVideoCaptions(captions: VideoCaptionConfig) {
  return (
    captions.mode === DEFAULT_VIDEO_CAPTIONS.mode &&
    captions.lyricsText === DEFAULT_VIDEO_CAPTIONS.lyricsText &&
    captions.position === DEFAULT_VIDEO_CAPTIONS.position &&
    captions.offsetX === DEFAULT_VIDEO_CAPTIONS.offsetX &&
    captions.offsetY === DEFAULT_VIDEO_CAPTIONS.offsetY &&
    captions.fontSize === DEFAULT_VIDEO_CAPTIONS.fontSize &&
    captions.rotation === DEFAULT_VIDEO_CAPTIONS.rotation &&
    captions.showBeatDrops === DEFAULT_VIDEO_CAPTIONS.showBeatDrops
  );
}

export function getLyricLines(lyricsText: string) {
  return lyricsText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 120);
}

export function getActiveLyricCaption({
  captions,
  currentTime,
  duration,
}: {
  captions: VideoCaptionConfig;
  currentTime: number;
  duration: number;
}) {
  const lines = getLyricLines(captions.lyricsText);

  if (captions.mode !== "lyrics" || lines.length === 0 || duration <= 0) {
    return null;
  }

  const lineDuration = duration / lines.length;
  const activeIndex = clamp(
    Math.floor(currentTime / Math.max(lineDuration, 0.1)),
    0,
    lines.length - 1
  );

  return {
    text: lines[activeIndex],
    emphasis: "lyric" as const,
  };
}

export function getActiveBeatCaption({
  captions,
  audioAnalysis,
  currentTime,
}: {
  captions: VideoCaptionConfig;
  audioAnalysis: VideoAudioAnalysis | null;
  currentTime: number;
}) {
  if (captions.mode !== "beat" || !audioAnalysis) return null;

  const dropWindowSeconds = 0.45;
  const isDrop = audioAnalysis.dropTimes.some(
    (dropTime) => Math.abs(dropTime - currentTime) <= dropWindowSeconds
  );

  if (isDrop && captions.showBeatDrops) {
    return {
      text: "DROP",
      emphasis: "drop" as const,
    };
  }

  const nearestPoint = audioAnalysis.points.reduce(
    (bestPoint, point) =>
      Math.abs(point.time - currentTime) < Math.abs(bestPoint.time - currentTime)
        ? point
        : bestPoint,
    audioAnalysis.points[0]
  );

  if (!nearestPoint || nearestPoint.onset < 0.64) return null;

  return {
    text: "BEAT",
    emphasis: "beat" as const,
  };
}

export function getActiveVideoCaption({
  captions,
  audioAnalysis,
  currentTime,
  duration,
}: {
  captions: VideoCaptionConfig;
  audioAnalysis: VideoAudioAnalysis | null;
  currentTime: number;
  duration: number;
}) {
  if (captions.mode === "lyrics") {
    return getActiveLyricCaption({ captions, currentTime, duration });
  }

  return getActiveBeatCaption({ captions, audioAnalysis, currentTime });
}
