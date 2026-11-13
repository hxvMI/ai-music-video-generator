"use client";

import { useState } from "react";
import { MoveHorizontal, Play, Trash2 } from "lucide-react";
import { distributeCaptionCues, editCaptionCue, shiftCaptionCues } from "@/lib/videoCaptions";
import type { VideoCaptionConfig, VideoCaptionCue } from "@/types/videoProject";

type Props = {
  captions: VideoCaptionConfig;
  duration: number;
  onChange: (captions: VideoCaptionConfig) => void;
  onSeek: (seconds: number) => void;
};

function CueTime({ value, label, onCommit }: {
  value: number; label: string; onCommit: (value: number) => boolean;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [invalid, setInvalid] = useState(false);
  return (
    <label className="grid min-w-0 gap-1 text-xs text-gray-700">
      {label} (seconds)
      <input type="number" min={0} step={0.01} value={draft}
        aria-invalid={invalid}
        onChange={(event) => { setDraft(event.target.value); setInvalid(false); }}
        onBlur={() => {
          const accepted = draft.trim() !== "" && onCommit(Number(draft));
          setInvalid(!accepted);
          if (!accepted) setDraft(value.toFixed(2));
        }}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        className="w-full min-w-0 rounded border px-2 py-2 text-sm text-gray-950" />
      {invalid && <span className="text-red-700">Keep times within the track without overlapping another cue.</span>}
    </label>
  );
}

export default function CaptionTimingEditor({ captions, duration, onChange, onSeek }: Props) {
  const [timingShift, setTimingShift] = useState("0");
  const cues = captions.cues;
  // Keep the plain-text lyrics in sync so saved projects still have an editable fallback.
  const replaceCues = (nextCues: VideoCaptionCue[]) => onChange({
    ...captions, cues: nextCues, lyricsText: nextCues.map((cue) => cue.text).join("\n"),
  });
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-950">Caption timing</p>
        {cues.length === 0 && (
          <button type="button" disabled={duration <= 0 || !captions.lyricsText.trim()}
            onClick={() => replaceCues(distributeCaptionCues(captions.lyricsText, duration))}
            className="rounded border px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
            Create timed cues
          </button>
        )}
      </div>
      {cues.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 gap-1 text-xs text-gray-700">
            Timing shift (seconds)
            <input type="number" step={0.1} value={timingShift}
              onChange={(event) => setTimingShift(event.target.value)}
              className="w-36 rounded border px-2 py-2 text-sm text-gray-950" />
          </label>
          <button type="button" disabled={!Number.isFinite(Number(timingShift)) || Number(timingShift) === 0}
            onClick={() => { replaceCues(shiftCaptionCues(cues, Number(timingShift), duration)); setTimingShift("0"); }}
            className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
            <MoveHorizontal aria-hidden="true" className="h-4 w-4" /> Shift timing
          </button>
        </div>
      )}
      <div className="grid max-h-96 gap-3 overflow-y-auto">
        {cues.map((cue, index) => (
          <div key={cue.id} className="grid gap-2 border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-700">Cue {index + 1}</span>
              <div className="flex gap-2">
                <button type="button" title="Preview cue" aria-label={`Preview cue ${index + 1}`}
                  onClick={() => onSeek(cue.startSeconds)} className="rounded border p-2 text-gray-700">
                  <Play className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" title="Delete cue" aria-label={`Delete cue ${index + 1}`}
                  onClick={() => replaceCues(cues.filter((item) => item.id !== cue.id))}
                  className="rounded border p-2 text-red-700">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <label className="grid gap-1 text-xs text-gray-700">Text
              <input type="text" value={cue.text} onChange={(event) => replaceCues(
                editCaptionCue(cues, cue.id, { text: event.target.value }, duration)
              )} className="min-w-0 rounded border px-2 py-2 text-sm text-gray-950" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["startSeconds", "endSeconds"] as const).map((field) => (
                <CueTime key={`${field}-${cue[field]}`} label={field === "startSeconds" ? "Start" : "End"}
                  value={cue[field]} onCommit={(value) => {
                    const next = editCaptionCue(cues, cue.id, { [field]: value }, duration);
                    if (next === cues) return false;
                    replaceCues(next);
                    return true;
                  }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
