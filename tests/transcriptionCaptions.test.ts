import { describe, expect, it } from "vitest";

import {
  parseWebVttCaptionCues,
  segmentsToCaptionCues,
} from "../app/lib/transcriptionCaptions";

describe("transcription caption conversion", () => {
  it("groups words using source timestamps and leaves instrumental gaps empty", () => {
    const cues = segmentsToCaptionCues([{ start: 1, end: 12,
      text: "First line Second line",
      words: [
        { word: "First", start: 1, end: 1.5 }, { word: "line", start: 1.5, end: 2 },
        { word: "Second", start: 9, end: 10 }, { word: "line", start: 10, end: 12 },
      ],
    }]);
    expect(cues.map(({ startSeconds, endSeconds, text }) => ({ startSeconds, endSeconds, text })))
      .toEqual([{ startSeconds: 1, endSeconds: 2, text: "First line" },
        { startSeconds: 9, endSeconds: 12, text: "Second line" }]);
  });

  it("keeps provider segment timing when word timestamps are missing or incomplete", () => {
    const cue = { start: 3, end: 8, text: "All the words", words: [{ word: "All", start: 3, end: 4 }] };
    expect(segmentsToCaptionCues([cue])[0]).toMatchObject({ startSeconds: 3, endSeconds: 8, text: cue.text });
  });

  it("limits word groups to readable lengths without losing words", () => {
    const words = Array.from({ length: 30 }, (_, index) => ({ word: `word${index}`, start: index, end: index + 0.9 }));
    const text = words.map((word) => word.word).join(" ");
    const cues = segmentsToCaptionCues([{ start: 0, end: 30, text, words }]);
    expect(cues.length).toBeGreaterThan(1);
    expect(cues.every((cue) => cue.text.length <= 56 && cue.endSeconds - cue.startSeconds <= 5)).toBe(true);
    expect(cues.map((cue) => cue.text).join(" ")).toBe(text);
  });
  it("converts provider segments and removes invalid entries", () => {
    expect(
      segmentsToCaptionCues([
        { start: 1.25, end: 3.5, text: " First line " },
        { start: 4, end: 4, text: "Invalid duration" },
        { start: 5, end: 7, text: "" },
      ])
    ).toEqual([
      {
        id: "transcript-1",
        startSeconds: 1.25,
        endSeconds: 3.5,
        text: "First line",
      },
    ]);
  });

  it("parses WebVTT timestamps, cue identifiers, settings, and markup", () => {
    const cues = parseWebVttCaptionCues(`WEBVTT

cue-1
00:00:01.500 --> 00:00:03.250 align:center
<b>Lights</b> in the city

00:01:02.000 --> 00:01:04.500
Second line`);

    expect(cues).toEqual([
      {
        id: "transcript-1",
        startSeconds: 1.5,
        endSeconds: 3.25,
        text: "Lights in the city",
      },
      {
        id: "transcript-2",
        startSeconds: 62,
        endSeconds: 64.5,
        text: "Second line",
      },
    ]);
  });
});
