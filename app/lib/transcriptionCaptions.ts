import type { VideoCaptionCue } from "@/types/videoProject";

type TimedTextSegment = {
  start?: number;
  end?: number;
  text?: string;
  words?: Array<{ start?: number; end?: number; word?: string }>;
};

function parseVttTime(value: string) {
  const parts = value.trim().replace(",", ".").split(":").map(Number);

  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];

  return null;
}

export function segmentsToCaptionCues(segments: TimedTextSegment[]) {
  return segments
    .flatMap((segment, index): VideoCaptionCue[] => {
      const text = segment.text?.trim() ?? "";
      const startSeconds = segment.start;
      const endSeconds = segment.end;

      if (
        !text ||
        !Number.isFinite(startSeconds) ||
        !Number.isFinite(endSeconds) ||
        (startSeconds as number) < 0 ||
        (endSeconds as number) <= (startSeconds as number)
      ) {
        return [];
      }

      // Keep real word boundaries when supplied; never invent word-level timing.
      const words = segment.words?.filter((word) =>
        typeof word.word === "string" && word.word.trim() &&
        Number.isFinite(word.start) && Number.isFinite(word.end) &&
        word.start! >= startSeconds! && word.end! <= endSeconds! && word.end! > word.start!
      );
      if (words?.length && words.every((word, wordIndex) =>
        wordIndex === 0 || word.start! >= words[wordIndex - 1].end!
      ) && words.map((word) => word.word!.trim()).join(" ").replace(/\s/g, "") === text.replace(/\s/g, "")) {
        const cues: VideoCaptionCue[] = [];
        let group: typeof words = [];
        const flush = () => {
          if (!group.length) return;
          cues.push({
            id: `transcript-${index + 1}-${cues.length + 1}`,
            startSeconds: group[0].start!, endSeconds: group[group.length - 1].end!,
            text: group.map((word) => word.word!.trim()).join(" "),
          });
          group = [];
        };
        for (const word of words) {
          const previous = group[group.length - 1];
          // Start a new cue when a line gets long or the singer leaves a noticeable pause.
          if (previous && (
            group.map((item) => item.word!.trim()).join(" ").length + word.word!.trim().length + 1 > 56 ||
            word.end! - group[0].start! > 5 || word.start! - previous.end! > 0.8
          )) flush();
          group.push(word);
        }
        flush();
        return cues;
      }

      return [{
        id: `transcript-${index + 1}`,
        startSeconds: startSeconds as number,
        endSeconds: endSeconds as number,
        text,
      }];
    })
    .slice(0, 240);
}

export function parseWebVttCaptionCues(vtt: string | null | undefined) {
  if (!vtt?.trim()) return [];

  const blocks = vtt.replace(/^WEBVTT[^\n]*\n/i, "").split(/\r?\n\s*\r?\n/g);
  const segments: TimedTextSegment[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));

    if (timingIndex < 0) continue;
    const [startValue, endWithSettings] = lines[timingIndex].split("-->");
    const endValue = endWithSettings?.trim().split(/\s+/)[0];
    const start = parseVttTime(startValue ?? "");
    const end = parseVttTime(endValue ?? "");
    const text = lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/g, "");

    if (start !== null && end !== null) segments.push({ start, end, text });
  }

  return segmentsToCaptionCues(segments);
}
