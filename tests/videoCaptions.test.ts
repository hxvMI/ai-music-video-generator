import { describe, expect, it } from "vitest";

import {
  DEFAULT_VIDEO_CAPTIONS,
  getActiveLyricCaption,
  normalizeVideoCaptions,
  distributeCaptionCues,
  editCaptionCue,
  getLyricLines,
  shiftCaptionCues,
} from "../app/lib/videoCaptions";

describe("video captions", () => {
  it("shifts all caption timings together and clamps at track edges", () => {
    const cues = [{ id: "one", startSeconds: 2, endSeconds: 4, text: "One" },
      { id: "two", startSeconds: 6, endSeconds: 8, text: "Two" }];
    expect(shiftCaptionCues(cues, 0.5, 10).map((cue) => cue.startSeconds)).toEqual([2.5, 6.5]);
    expect(shiftCaptionCues(cues, -20, 10).map((cue) => cue.startSeconds)).toEqual([0, 4]);
    expect(shiftCaptionCues(cues, 20, 10).map((cue) => cue.endSeconds)).toEqual([6, 10]);
    expect(shiftCaptionCues(cues, NaN, 10)).toBe(cues);
  });
  it("breaks paragraph transcripts into readable fallback captions without losing words", () => {
    const text = Array.from({ length: 80 }, (_, index) => `word${index}`).join(" ");
    const lines = getLyricLines(text);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 72)).toBe(true);
    expect(lines.join(" ")).toBe(text);
    const cues = distributeCaptionCues(text, 60);
    expect(cues).toHaveLength(lines.length);
    expect(cues.at(-1)?.endSeconds).toBe(60);
    expect(getLyricLines("First line\nSecond line")).toEqual(["First line", "Second line"]);
  });
  it("creates editable cues and rejects overlaps or out-of-track edits", () => {
    const cues = distributeCaptionCues("First\nSecond", 10);
    expect(cues.map((cue) => [cue.startSeconds, cue.endSeconds])).toEqual([[0, 5], [5, 10]]);
    expect(editCaptionCue(cues, cues[0].id, { endSeconds: 6 }, 10)).toBe(cues);
    expect(editCaptionCue(cues, cues[1].id, { endSeconds: 11 }, 10)).toBe(cues);
    expect(editCaptionCue(cues, cues[0].id, { endSeconds: 4 }, 10)[0].endSeconds).toBe(4);
  });

  it("does not leave fallback lyrics visible after track end", () => {
    const captions = normalizeVideoCaptions({ mode: "lyrics", lyricsText: "First" });
    expect(getActiveLyricCaption({ captions, currentTime: 10, duration: 10 })).toBeNull();
  });
  it("backfills cues for projects saved before timed captions", () => {
    const normalized = normalizeVideoCaptions({
      mode: "lyrics",
      lyricsText: "One\nTwo",
    });

    expect(normalized.cues).toEqual([]);
    expect(normalized.position).toBe(DEFAULT_VIDEO_CAPTIONS.position);
  });

  it("uses transcription timing when cues are available", () => {
    const captions = normalizeVideoCaptions({
      mode: "lyrics",
      lyricsText: "Fallback should not override timed cues",
      cues: [
        { id: "a", startSeconds: 2, endSeconds: 4, text: "Timed lyric" },
      ],
    });

    expect(
      getActiveLyricCaption({ captions, currentTime: 2.5, duration: 10 })
    ).toEqual({ text: "Timed lyric", emphasis: "lyric" });
    expect(
      getActiveLyricCaption({ captions, currentTime: 5, duration: 10 })
    ).toBeNull();
  });

  it("retains evenly distributed fallback for manual lyrics", () => {
    const captions = normalizeVideoCaptions({
      mode: "lyrics",
      lyricsText: "First\nSecond",
    });

    expect(
      getActiveLyricCaption({ captions, currentTime: 7, duration: 10 })
    ).toEqual({ text: "Second", emphasis: "lyric" });
  });
});
