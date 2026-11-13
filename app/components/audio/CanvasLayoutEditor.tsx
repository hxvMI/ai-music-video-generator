"use client";

import NumericControl from "@/components/ui/NumericControl";
import { DEFAULT_VIDEO_LAYOUT, OVERLAY_POSITION_OPTIONS, VIDEO_FONT_OPTIONS } from "@/lib/videoLayout";
import type { OverlayPosition, ProgressStyle, VideoFontFamily, VideoLayoutConfig } from "@/types/videoProject";

type Props = { layout: VideoLayoutConfig; onChange: (layout: VideoLayoutConfig) => void; progressColor: string; onProgressColor: (color: string) => void };
type NumericKey = { [K in keyof VideoLayoutConfig]: VideoLayoutConfig[K] extends number ? K : never }[keyof VideoLayoutConfig];
type Field = readonly [NumericKey, string, number, number, number, string];
const inputClass = "min-w-0 rounded-lg border px-3 py-2 text-sm font-normal text-gray-950";

export default function CanvasLayoutEditor({ layout, onChange, progressColor, onProgressColor }: Props) {
  const update = <K extends keyof VideoLayoutConfig>(key: K, value: VideoLayoutConfig[K]) => onChange({ ...layout, [key]: value });
  const fields = (items: readonly Field[]) => (
    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      {items.map(([key, label, min, max, step, unit]) => (
        <NumericControl key={key} label={label} value={layout[key]} min={min} max={max} step={step}
          unit={unit} defaultValue={DEFAULT_VIDEO_LAYOUT[key]} onChange={(value) => update(key, value)} />
      ))}
    </div>
  );
  const position = (label: string, key: "titlePosition" | "progressPosition" | "progressTimePosition") => (
    <label className="mb-4 grid gap-1.5 text-xs font-medium text-gray-700">{label}
      <select className={inputClass} value={layout[key]} onChange={(event) => update(key, event.target.value as OverlayPosition)}>
        {OVERLAY_POSITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
  return (
    <div>
      <div className="layout-group">
        <div className="layout-group-heading"><h3 className="text-sm font-semibold text-gray-950">Background</h3></div>
        <NumericControl label="Zoom" value={layout.backgroundScale * 100} min={100} max={150} step={1} unit="%"
          defaultValue={100} onChange={(value) => update("backgroundScale", value / 100)} />
        <div className="mt-4">{fields([
          ["backgroundOffsetX", "Horizontal", -240, 240, 5, "px"],
          ["backgroundOffsetY", "Vertical", -160, 160, 5, "px"],
        ])}</div>
      </div>
      <div className="layout-group">
        <div className="layout-group-heading"><h3 className="text-sm font-semibold text-gray-950">Title & artist</h3></div>
        <label className="mb-4 grid gap-1.5 text-xs font-medium text-gray-700">Video font
          <select className={inputClass} value={layout.fontFamily} onChange={(event) => update("fontFamily", event.target.value as VideoFontFamily)}>
            {VIDEO_FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {position("Position", "titlePosition")}
        {fields([
          ["titleOffsetX", "Horizontal", -900, 900, 5, "px"],
          ["titleOffsetY", "Vertical", -600, 600, 5, "px"],
          ["titleRotation", "Rotation", -180, 180, 1, "deg"],
        ])}
      </div>
      <div className="layout-group">
        <div className="layout-group-heading"><h3 className="text-sm font-semibold text-gray-950">Progress bar</h3>
          <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={layout.showProgress} onChange={(event) => update("showProgress", event.target.checked)} />Show</label>
        </div>
        {position("Position", "progressPosition")}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-gray-700">Style
            <select className={inputClass} value={layout.progressStyle} onChange={(event) => update("progressStyle", event.target.value as ProgressStyle)}>
              {(["solid", "glow", "gradient", "segmented", "minimal", "pulse"] as const).map((style) => <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-gray-700">Color
            <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5">
              <input type="color" aria-label="Progress bar color" value={progressColor} onChange={(event) => onProgressColor(event.target.value)} className="h-7 w-9 border-0 bg-transparent p-0" />
              <span className="font-mono text-xs text-gray-600">{progressColor}</span>
            </div>
          </label>
        </div>
        {fields([
          ["progressOffsetX", "Horizontal", -360, 360, 5, "px"],
          ["progressOffsetY", "Vertical", -260, 260, 5, "px"],
          ["progressWidth", "Width", 360, 1600, 20, "px"],
          ["progressHeight", "Height", 2, 48, 1, "px"],
          ["progressRotation", "Rotation", -180, 180, 1, "deg"],
        ])}
      </div>
      <div className="layout-group">
        <div className="layout-group-heading"><h3 className="text-sm font-semibold text-gray-950">Timer</h3>
          <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={layout.showProgressTime} onChange={(event) => update("showProgressTime", event.target.checked)} />Show</label>
        </div>
        {position("Position", "progressTimePosition")}
        {fields([
          ["progressTimeOffsetX", "Horizontal", -900, 900, 10, "px"],
          ["progressTimeOffsetY", "Vertical", -600, 600, 10, "px"],
          ["progressTimeRotation", "Rotation", -180, 180, 1, "deg"],
        ])}
        <div className="mt-4"><NumericControl label="Scale" value={layout.progressTimeScale * 100} min={50} max={300} step={5} unit="%"
          defaultValue={100} onChange={(value) => update("progressTimeScale", value / 100)} /></div>
      </div>
    </div>
  );
}
