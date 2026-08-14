"use client";

import { RotateCcw, Scissors, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  CAMERA_PRESETS,
  EFFECT_PRESETS,
  VISUAL_PRESET_LABELS,
  VISUALIZER_PRESETS,
} from "@/lib/visualPresetSelection";
import {
  MAX_REACTIVE_ZONES,
  MIN_REACTIVE_ZONE_SECONDS,
  moveReactiveBoundary,
  REACTIVE_ZONE_COLORS,
  REACTIVE_ZONE_LABELS,
  removeReactiveZone,
  splitReactiveZone,
  updateReactiveZone,
} from "@/lib/reactiveArrangement";
import type {
  CameraPreset,
  EffectPreset,
  ReactiveTimeline,
  ReactiveZone,
  ReactiveZoneKind,
  VisualMode,
  VisualizerPreset,
} from "@/types/videoProject";

type ReactiveArrangementEditorProps = {
  visualMode: VisualMode;
  timeline: ReactiveTimeline;
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onZonesChange: (zones: ReactiveZone[]) => void;
  onResetAutomatic: () => void;
};

function formatTime(seconds: number) {
  const roundedSeconds = Math.round(Math.max(seconds, 0) * 10) / 10;
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds - minutes * 60;

  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, "0")}`;
}

function parseTime(value: string) {
  const parts = value.trim().split(":");

  if (parts.length === 1) {
    const seconds = Number(parts[0]);

    return Number.isFinite(seconds) ? seconds : null;
  }

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);

    if (
      Number.isFinite(minutes) &&
      Number.isFinite(seconds) &&
      minutes >= 0 &&
      seconds >= 0 &&
      seconds < 60
    ) {
      return minutes * 60 + seconds;
    }
  }

  return null;
}

function TimeBoundaryInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (seconds: number) => void;
}) {
  const [draft, setDraft] = useState(formatTime(value));

  const commit = () => {
    const parsedValue = parseTime(draft);

    if (parsedValue !== null) onCommit(parsedValue);
    setDraft(formatTime(parsedValue ?? value));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="w-full rounded-lg border px-3 py-2 font-mono text-sm text-gray-950 outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500"
    />
  );
}

export default function ReactiveArrangementEditor({
  visualMode,
  timeline,
  duration,
  currentTime,
  onSeek,
  onZonesChange,
  onResetAutomatic,
}: ReactiveArrangementEditorProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const zones = timeline.zones;
  const selectedZone =
    zones.find((zone) => zone.id === selectedZoneId) ?? zones[0] ?? null;
  const selectedZoneIndex = selectedZone
    ? zones.findIndex((zone) => zone.id === selectedZone.id)
    : -1;
  const activeZone = zones.find(
    (zone, index) =>
      currentTime >= zone.startSeconds &&
      (currentTime < zone.endSeconds || index === zones.length - 1)
  );

  if (visualMode !== "auto") {
    return (
      <p className="text-sm text-gray-600">
        Choose Auto visual mode to use section-aware builds and drops. Manual
        and Random continue using one visual setup for the full track.
      </p>
    );
  }

  if (zones.length === 0 || duration <= 0) {
    return (
      <p className="text-sm text-gray-600">
        Upload a track and wait for audio analysis to create the arrangement.
      </p>
    );
  }

  const updateSelectedZone = (
    updates: Parameters<typeof updateReactiveZone>[2]
  ) => {
    if (!selectedZone) return;
    onZonesChange(updateReactiveZone(zones, selectedZone.id, updates));
  };

  return (
    <div className="reactive-editor min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {timeline.mode === "auto" ? "Automatic" : "Custom"} arrangement ·{" "}
          {zones.length} zones
        </p>
        {timeline.mode === "custom" && (
          <button
            type="button"
            onClick={onResetAutomatic}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset to automatic
          </button>
        )}
      </div>

      <div className="mt-3 flex h-12 w-full overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
        {zones.map((zone) => {
          const widthPercent =
            ((zone.endSeconds - zone.startSeconds) / duration) * 100;
          const isSelected = selectedZone?.id === zone.id;
          const isActive = activeZone?.id === zone.id;

          return (
            <button
              key={zone.id}
              type="button"
              title={`${REACTIVE_ZONE_LABELS[zone.kind]} ${formatTime(
                zone.startSeconds
              )}-${formatTime(zone.endSeconds)}`}
              onClick={() => {
                setSelectedZoneId(zone.id);
                onSeek(zone.startSeconds);
              }}
              className={[
                "h-full min-w-0 overflow-hidden border-r border-white/50 px-1 text-xs font-semibold text-white outline-none",
                isSelected ? "ring-2 ring-inset ring-gray-950" : "",
                isActive ? "brightness-110" : "brightness-90",
              ].join(" ")}
              style={{
                backgroundColor: REACTIVE_ZONE_COLORS[zone.kind],
                width: `${widthPercent}%`,
              }}
            >
              <span className="block truncate">
                {REACTIVE_ZONE_LABELS[zone.kind]}
              </span>
            </button>
          );
        })}
      </div>

      {selectedZone && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-950">
                {REACTIVE_ZONE_LABELS[selectedZone.kind]}
              </p>
              <p className="text-xs text-gray-500">
                {formatTime(selectedZone.startSeconds)} to{" "}
                {formatTime(selectedZone.endSeconds)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                title="Split zone"
                disabled={
                  zones.length >= MAX_REACTIVE_ZONES ||
                  selectedZone.endSeconds - selectedZone.startSeconds <
                    MIN_REACTIVE_ZONE_SECONDS * 2
                }
                onClick={() =>
                  onZonesChange(splitReactiveZone(zones, selectedZone.id))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Scissors aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Remove zone"
                disabled={zones.length <= 1}
                onClick={() =>
                  onZonesChange(removeReactiveZone(zones, selectedZone.id))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Start
              <TimeBoundaryInput
                key={`start-${selectedZone.id}-${selectedZone.startSeconds}`}
                value={selectedZone.startSeconds}
                disabled={selectedZoneIndex === 0}
                onCommit={(seconds) =>
                  onZonesChange(
                    moveReactiveBoundary(
                      zones,
                      selectedZoneIndex - 1,
                      seconds
                    )
                  )
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              End
              <TimeBoundaryInput
                key={`end-${selectedZone.id}-${selectedZone.endSeconds}`}
                value={selectedZone.endSeconds}
                disabled={selectedZoneIndex === zones.length - 1}
                onCommit={(seconds) =>
                  onZonesChange(
                    moveReactiveBoundary(zones, selectedZoneIndex, seconds)
                  )
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Section type
              <select
                value={selectedZone.kind}
                onChange={(event) =>
                  updateSelectedZone({
                    kind: event.target.value as ReactiveZoneKind,
                  })
                }
                className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
              >
                {Object.entries(REACTIVE_ZONE_LABELS).map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Intensity · {Math.round(selectedZone.intensity * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selectedZone.intensity}
                onChange={(event) =>
                  updateSelectedZone({
                    intensity: Number(event.target.value),
                  })
                }
                className="mt-2 w-full accent-cyan-700"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Visualizer
              <select
                value={selectedZone.visualizerPreset}
                onChange={(event) =>
                  updateSelectedZone({
                    visualizerPreset: event.target.value as VisualizerPreset,
                  })
                }
                className="rounded-lg border px-3 py-2 font-normal text-gray-950"
              >
                {VISUALIZER_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {VISUAL_PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Camera
              <select
                value={selectedZone.cameraPreset}
                onChange={(event) =>
                  updateSelectedZone({
                    cameraPreset: event.target.value as CameraPreset,
                  })
                }
                className="rounded-lg border px-3 py-2 font-normal text-gray-950"
              >
                {CAMERA_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {VISUAL_PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
              Effects
              <select
                value={selectedZone.effectPreset}
                onChange={(event) =>
                  updateSelectedZone({
                    effectPreset: event.target.value as EffectPreset,
                  })
                }
                className="rounded-lg border px-3 py-2 font-normal text-gray-950"
              >
                {EFFECT_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {VISUAL_PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
