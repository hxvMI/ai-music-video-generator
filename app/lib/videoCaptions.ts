import type {
  VideoAudioAnalysis,
  VideoCaptionCue,
  VideoCaptionConfig,
} from "@/types/videoProject";

export const DEFAULT_VIDEO_CAPTIONS: VideoCaptionConfig = {
  mode: "off",
  lyricsText: "",
  cues: [],
  position: "bottom-center",
  offsetX: 0,
  offsetY: -80,
  fontSize: 48,
  rotation: 0,
  showBeatDrops: true,
};

export function normalizeCaptionCues(
  cues: VideoCaptionCue[] | null | undefined
) {
  return (Array.isArray(cues) ? cues : [])
    .filter(
      (cue) =>
        cue && typeof cue.text === "string" && Number.isFinite(cue.startSeconds) &&
        Number.isFinite(cue.endSeconds) &&
        cue.startSeconds >= 0 &&
        cue.endSeconds > cue.startSeconds &&
        cue.text.trim().length > 0
    )
    .map((cue, index) => ({
      id: cue.id || `caption-${index + 1}`,
      startSeconds: cue.startSeconds,
      endSeconds: cue.endSeconds,
      text: cue.text.trim(),
    }))
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .slice(0, 240);
}

export function normalizeVideoCaptions(
  captions: Partial<VideoCaptionConfig> | null | undefined
): VideoCaptionConfig {
  return {
    ...DEFAULT_VIDEO_CAPTIONS,
    ...captions,
    cues: normalizeCaptionCues(captions?.cues),
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function isDefaultVideoCaptions(captions: VideoCaptionConfig) {
  return (
    captions.mode === DEFAULT_VIDEO_CAPTIONS.mode &&
    captions.lyricsText === DEFAULT_VIDEO_CAPTIONS.lyricsText &&
    JSON.stringify(normalizeCaptionCues(captions.cues)) ===
      JSON.stringify(DEFAULT_VIDEO_CAPTIONS.cues) &&
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
    .flatMap((line) => {
      // Untimed providers can return the entire song as one paragraph.
      const lines: string[] = [];
      let current = "";
      for (const word of line.split(/\s+/)) {
        if (current && current.length + word.length + 1 > 72) {
          lines.push(current);
          current = "";
        }
        current = current ? `${current} ${word}` : word;
      }
      if (current) lines.push(current);
      return lines;
    })
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
  const timedCues = normalizeCaptionCues(captions.cues);

  if (captions.mode !== "lyrics" || !Number.isFinite(currentTime) ||
      currentTime < 0 || currentTime >= duration) {
    return null;
  }

  const timedCue = timedCues.find(
    (cue) => currentTime >= cue.startSeconds && currentTime < cue.endSeconds
  );

  if (timedCue) {
    return {
      text: timedCue.text,
      emphasis: "lyric" as const,
    };
  }

  if (timedCues.length > 0 || lines.length === 0 || duration <= 0) return null;

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

export function distributeCaptionCues(text: string, duration: number): VideoCaptionCue[] {
  const lines = getLyricLines(text);
  if (!Number.isFinite(duration) || duration <= 0) return [];
  return lines.map((line, index) => ({
    id: `caption-${index + 1}`,
    startSeconds: (duration * index) / lines.length,
    endSeconds: (duration * (index + 1)) / lines.length,
    text: line,
  }));
}

export function editCaptionCue(
  cues: VideoCaptionCue[], id: string,
  update: Partial<Pick<VideoCaptionCue, "text" | "startSeconds" | "endSeconds">>,
  duration: number
) {
  const index = cues.findIndex((cue) => cue.id === id);
  if (index < 0) return cues;
  const candidate = { ...cues[index], ...update };
  const minimumStart = cues[index - 1]?.endSeconds ?? 0;
  const maximumEnd = cues[index + 1]?.startSeconds ?? duration;
  if (!Number.isFinite(candidate.startSeconds) || !Number.isFinite(candidate.endSeconds) ||
      candidate.startSeconds < minimumStart || candidate.endSeconds > maximumEnd ||
      candidate.endSeconds <= candidate.startSeconds) return cues;
  return cues.map((cue, cueIndex) => cueIndex === index ? candidate : cue);
}

export function shiftCaptionCues(cues: VideoCaptionCue[], offset: number, duration: number) {
  if (!cues.length || !Number.isFinite(offset) || !Number.isFinite(duration) || duration <= 0) return cues;
  const firstStart = Math.min(...cues.map((cue) => cue.startSeconds));
  const lastEnd = Math.max(...cues.map((cue) => cue.endSeconds));
  // Shift the whole group together so clipping cannot collapse cues or introduce overlaps.
  if (firstStart < 0 || lastEnd > duration) return cues;
  const shift = clamp(offset, -firstStart, duration - lastEnd);
  if (shift === 0) return cues;
  return cues.map((cue) => ({ ...cue,
    startSeconds: cue.startSeconds + shift, endSeconds: cue.endSeconds + shift,
  }));
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
