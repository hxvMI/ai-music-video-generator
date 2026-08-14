/* PURPOSE:
Central editor for every render-safe visual setting. Keeping these controls in
one component makes saved presets, the Remotion preview, and MP4 export resolve
the same project configuration.
*/

"use client";

import { useRef, useState } from "react";
import { Download, Plus, Save, Trash2, Upload } from "lucide-react";

import CollapsibleCard from "@/components/ui/CollapsibleCard";
import ReactiveArrangementEditor from "./ReactiveArrangementEditor";
import {
  getActiveReactiveZone,
  REACTIVE_ZONE_LABELS,
} from "@/lib/reactiveArrangement";
import {
  CAMERA_PRESETS,
  EFFECT_PRESETS,
  formatResolvedPresetSummary,
  resolveVisualPresets,
  VISUAL_PRESET_LABELS,
  VISUALIZER_PRESETS,
} from "@/lib/visualPresetSelection";
import { VIDEO_THEME_PRESETS } from "@/lib/videoThemePresets";
import {
  DEFAULT_VIDEO_LAYOUT,
  DEFAULT_VISUALIZER_LAYER,
  normalizeVideoLayout,
  OVERLAY_POSITION_OPTIONS,
} from "@/lib/videoLayout";
import {
  DEFAULT_VIDEO_CAPTIONS,
  getLyricLines,
} from "@/lib/videoCaptions";
import type {
  CaptionMode,
  VideoAudioAnalysis,
  VideoTheme,
  VisualMode,
  VisualizerPreset,
  CameraPreset,
  EffectPreset,
  ReactiveTimeline,
  ReactiveZone,
  OverlayPosition,
  ProgressStyle,
  VideoCaptionConfig,
  VideoLayoutConfig,
} from "@/types/videoProject";

type VisualDetailsProps = {
  videoTheme: VideoTheme;
  setVideoTheme: React.Dispatch<React.SetStateAction<VideoTheme>>;

  visualizerColor: string;
  setVisualizerColor: React.Dispatch<React.SetStateAction<string>>;

  visualMode: VisualMode;
  setVisualMode: React.Dispatch<React.SetStateAction<VisualMode>>;

  visualizerPreset: VisualizerPreset;
  setVisualizerPreset: React.Dispatch<React.SetStateAction<VisualizerPreset>>;

  cameraPreset: CameraPreset;
  setCameraPreset: React.Dispatch<React.SetStateAction<CameraPreset>>;

  effectPreset: EffectPreset;
  setEffectPreset: React.Dispatch<React.SetStateAction<EffectPreset>>;

  randomSeed: number;
  onRandomizeVisuals: () => void;
  layout: VideoLayoutConfig;
  setLayout: React.Dispatch<React.SetStateAction<VideoLayoutConfig>>;
  captions: VideoCaptionConfig;
  setCaptions: React.Dispatch<React.SetStateAction<VideoCaptionConfig>>;
  reactiveTimeline: ReactiveTimeline;
  duration: number;
  currentTime: number;
  seek: (seconds: number) => void;
  onReactiveZonesChange: (zones: ReactiveZone[]) => void;
  onResetReactiveTimeline: () => void;
  audioAnalysis: VideoAudioAnalysis | null;
  showTitle?: boolean;
  surface?: "card" | "plain";
};

const visualModeOptions: { value: VisualMode; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "random", label: "Random" },
  { value: "auto", label: "Auto" },
];

const progressStyleOptions: { value: ProgressStyle; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "glow", label: "Glow" },
  { value: "gradient", label: "Gradient" },
  { value: "segmented", label: "Segmented" },
  { value: "minimal", label: "Minimal Line" },
  { value: "pulse", label: "Pulse" },
];
const captionModeOptions: { value: CaptionMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "beat", label: "Beat" },
  { value: "lyrics", label: "Lyrics" },
];

type VisualStyleTemplate = {
  id: string;
  label: string;
  description: string;
  theme: VideoTheme;
  visualizerColor: string;
  visualMode: VisualMode;
  visualizerPreset: VisualizerPreset;
  cameraPreset: CameraPreset;
  effectPreset: EffectPreset;
  layout: VideoLayoutConfig;
};

type SavedVisualProfile = {
  id: string;
  name: string;
  savedAt: string;
  settings: {
    theme: VideoTheme;
    visualizerColor: string;
    visualMode: VisualMode;
    visualizerPreset: VisualizerPreset;
    cameraPreset: CameraPreset;
    effectPreset: EffectPreset;
    layout: VideoLayoutConfig;
    captions: VideoCaptionConfig;
  };
};

const VISUAL_PROFILE_STORAGE_KEY = "music-video-visual-profiles-v1";

function templateLayout(
  position: OverlayPosition,
  scaleX: number,
  scaleY: number,
  options: Partial<VideoLayoutConfig> = {}
): VideoLayoutConfig {
  return {
    ...DEFAULT_VIDEO_LAYOUT,
    ...options,
    visualizerPosition: position,
    visualizerScaleX: scaleX,
    visualizerScaleY: scaleY,
    visualizerLayers: [{
      ...DEFAULT_VISUALIZER_LAYER,
      position,
      offsetX: options.visualizerOffsetX ?? 0,
      offsetY: options.visualizerOffsetY ?? 0,
      scaleX,
      scaleY,
    }],
  };
}

const VISUAL_STYLE_TEMPLATES: VisualStyleTemplate[] = [
  {
    id: "clean-title",
    label: "Clean Title",
    description: "Simple title layout with low motion.",
    theme: "minimal",
    visualizerColor: "#00FFFF",
    visualMode: "manual",
    visualizerPreset: "minimal",
    cameraPreset: "locked",
    effectPreset: "clean",
    layout: templateLayout("bottom-center", 0.72, 0.62, {
      titlePosition: "top-left",
      titleOffsetY: 20,
      visualizerOffsetY: -150,
      progressPosition: "bottom-center",
      progressOffsetY: 40,
      progressWidth: 1040,
      showProgressTime: false,
    }),
  },
  {
    id: "neon-drop",
    label: "Neon Drop",
    description: "Bright visualizer, pulse camera, stronger glow.",
    theme: "neon",
    visualizerColor: "#7C3AED",
    visualMode: "manual",
    visualizerPreset: "spectrum",
    cameraPreset: "pulse",
    effectPreset: "glow",
    layout: templateLayout("bottom-center", 0.92, 0.86, {
      titlePosition: "top-left",
      progressPosition: "bottom-center",
      progressOffsetY: 120,
      progressWidth: 1080,
    }),
  },
  {
    id: "cinematic-cover",
    label: "Cinematic Cover",
    description: "Darker frame with drifting camera and vignette.",
    theme: "cinematic",
    visualizerColor: "#F4D35E",
    visualMode: "manual",
    visualizerPreset: "cinematic",
    cameraPreset: "drift",
    effectPreset: "vignette",
    layout: templateLayout("bottom-center", 0.76, 0.68, {
      titlePosition: "top-left",
      titleOffsetY: 30,
      visualizerOffsetY: -145,
      progressPosition: "bottom-center",
      progressOffsetY: 45,
      progressWidth: 980,
      progressTimePosition: "bottom-right",
      progressTimeOffsetY: 20,
    }),
  },
  {
    id: "auto-reactive",
    label: "Auto Reactive",
    description: "Lets audio analysis choose the final motion.",
    theme: "neon",
    visualizerColor: "#00E5FF",
    visualMode: "auto",
    visualizerPreset: "waveform",
    cameraPreset: "float",
    effectPreset: "glow",
    layout: templateLayout("bottom-center", 0.82, 0.8, {
      titlePosition: "top-left",
      progressPosition: "bottom-center",
      progressOffsetY: 110,
      progressWidth: 960,
    }),
  },
];

export default function VisualDetails({
  videoTheme,
  setVideoTheme,
  visualizerColor,
  setVisualizerColor,
  visualMode,
  setVisualMode,
  visualizerPreset,
  setVisualizerPreset,
  cameraPreset,
  setCameraPreset,
  effectPreset,
  setEffectPreset,
  randomSeed,
  onRandomizeVisuals,
  layout,
  setLayout,
  captions,
  setCaptions,
  reactiveTimeline,
  duration,
  currentTime,
  seek,
  onReactiveZonesChange,
  onResetReactiveTimeline,
  audioAnalysis,
  showTitle = true,
  surface = "card",
}: VisualDetailsProps) {
  const [profileName, setProfileName] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<SavedVisualProfile[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const storedProfiles = window.localStorage.getItem(VISUAL_PROFILE_STORAGE_KEY);
      return storedProfiles ? JSON.parse(storedProfiles) as SavedVisualProfile[] : [];
    } catch {
      return [];
    }
  });
  const profileUploadRef = useRef<HTMLInputElement>(null);
  // Interview Question:
  // why use setVideoTheme and functions etc.
  // instead of videoTheme = "EDM"
  // ANSWER: because REACT must be updated through the SETTER
  // setVideoTheme("EDM")
  // reason being the 1st one does not trigger object rerender

  // const [logoImage, setLogoImage] = useState<File | null>(null);
  // const [videoTheme, setVideoTheme] = useState("");
  // const [visualizerColor, setVisualizerColor] = useState("#00FFFF");
  const selectedTheme = VIDEO_THEME_PRESETS[videoTheme];
  const resolvedVisuals = resolveVisualPresets({
    style: {
      visualMode,
      visualizerPreset,
      cameraPreset,
      effectPreset,
      randomSeed,
    },
    audioAnalysis,
  });
  const activeReactiveZone =
    visualMode === "auto"
      ? getActiveReactiveZone(reactiveTimeline.zones, currentTime)
      : null;
  const displayedVisuals = activeReactiveZone
    ? {
        visualizerPreset: activeReactiveZone.visualizerPreset,
        cameraPreset: activeReactiveZone.cameraPreset,
        effectPreset: activeReactiveZone.effectPreset,
        reason: `${
          REACTIVE_ZONE_LABELS[activeReactiveZone.kind]
        } zone is active at the current preview time.`,
      }
    : resolvedVisuals;
  const isManualMode = visualMode === "manual";
  const applyTemplate = (template: VisualStyleTemplate) => {
    setVideoTheme(template.theme);
    setVisualizerColor(template.visualizerColor);
    setVisualMode(template.visualMode);
    setVisualizerPreset(template.visualizerPreset);
    setCameraPreset(template.cameraPreset);
    setEffectPreset(template.effectPreset);
    setLayout(template.layout);
  };
  const applyProfile = (profile: SavedVisualProfile) => {
    const settings = profile.settings;
    setVideoTheme(settings.theme);
    setVisualizerColor(settings.visualizerColor);
    setVisualMode(settings.visualMode);
    setVisualizerPreset(settings.visualizerPreset);
    setCameraPreset(settings.cameraPreset);
    setEffectPreset(settings.effectPreset);
    setLayout(normalizeVideoLayout(settings.layout));
    setCaptions(settings.captions);
  };
  const storeProfiles = (profiles: SavedVisualProfile[]) => {
    setSavedProfiles(profiles);
    window.localStorage.setItem(VISUAL_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  };
  const saveCurrentProfile = () => {
    const name = profileName.trim() || `Visual profile ${savedProfiles.length + 1}`;
    const profile: SavedVisualProfile = {
      id: crypto.randomUUID(),
      name,
      savedAt: new Date().toISOString(),
      settings: {
        theme: videoTheme,
        visualizerColor,
        visualMode,
        visualizerPreset,
        cameraPreset,
        effectPreset,
        layout,
        captions,
      },
    };
    storeProfiles([...savedProfiles, profile]);
    setProfileName("");
  };
  const downloadProfiles = () => {
    const blob = new Blob([JSON.stringify({ version: 1, profiles: savedProfiles }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "music-video-visual-profiles.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const importProfiles = async (file: File | null) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { profiles?: SavedVisualProfile[] };
      if (!Array.isArray(parsed.profiles)) return;
      const validProfiles = parsed.profiles.filter((profile) => profile?.settings?.layout && profile.name).slice(0, 50);
      storeProfiles([...savedProfiles, ...validProfiles]);
    } finally {
      if (profileUploadRef.current) profileUploadRef.current.value = "";
    }
  };
  const updateLayout = <Key extends keyof VideoLayoutConfig>(
    key: Key,
    value: VideoLayoutConfig[Key]
  ) => {
    setLayout((currentLayout) => ({ ...currentLayout, [key]: value }));
  };
  const updateVisualizerLayer = (
    layerId: string,
    values: Partial<VideoLayoutConfig["visualizerLayers"][number]>
  ) => {
    setLayout((currentLayout) => ({
      ...currentLayout,
      visualizerLayers: currentLayout.visualizerLayers.map((layer) =>
        layer.id === layerId ? { ...layer, ...values } : layer
      ),
    }));
  };
  const updateProgressColor = (color: string) => {
    // Preserve inherited layer colors before changing the progress accent so
    // progress and visualizer styling remain independently controlled.
    setLayout((currentLayout) => ({
      ...currentLayout,
      visualizerLayers: currentLayout.visualizerLayers.map((layer) => ({
        ...layer,
        color: layer.color ?? visualizerColor,
      })),
    }));
    setVisualizerColor(color);
  };
  const updateCaptions = <Key extends keyof VideoCaptionConfig>(
    key: Key,
    value: VideoCaptionConfig[Key]
  ) => {
    setCaptions((currentCaptions) => ({
      ...currentCaptions,
      [key]: value,
    }));
  };
  const lyricLineCount = getLyricLines(captions.lyricsText).length;
  const captionSummary =
    captions.mode === "off"
      ? "Captions off"
      : captions.mode === "beat"
        ? "Beat and drop callouts"
        : `${lyricLineCount} lyric lines`;

  const containerClass =
    surface === "card" ? "rounded-lg border bg-white p-4" : "";

  return (
    <div className={containerClass}>
      {showTitle && (
        <h2 className="font-semibold text-gray-950">Visual Design</h2>
      )}

      <div className={showTitle ? "mt-4 grid gap-3" : "grid gap-3"}>
        <CollapsibleCard
          title="Preset Gallery"
          category="Design"
          className="order-1"
          description="Apply a complete visual setup in one click."
          summary={`${selectedTheme.label}, ${visualMode} mode`}
          defaultOpen
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {VISUAL_STYLE_TEMPLATES.map((template) => {
              const isActive =
                videoTheme === template.theme &&
                visualizerColor === template.visualizerColor &&
                visualMode === template.visualMode &&
                visualizerPreset === template.visualizerPreset &&
                cameraPreset === template.cameraPreset &&
                effectPreset === template.effectPreset;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className={[
                    "selectable-card group/look grid min-h-32 grid-rows-[36px_auto_1fr] overflow-hidden rounded-lg border p-3 text-left transition",
                    isActive
                      ? "is-selected"
                      : "border-gray-200 bg-white hover:border-cyan-300",
                  ].join(" ")}
                >
                  <div className="mb-2 flex h-9 items-end gap-1 overflow-hidden rounded bg-gray-950 px-2 py-1.5">
                    {Array.from({ length: 14 }, (_, index) => (
                      <span key={index} className="w-1 rounded-full" style={{ height: `${25 + ((index * 37) % 70)}%`, backgroundColor: template.visualizerColor }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-950">
                      {template.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Saved Presets"
          category="Design"
          className="order-2"
          description="Reuse a setup from this browser or exchange it as a JSON file."
          summary={`${savedProfiles.length} saved profile${savedProfiles.length === 1 ? "" : "s"}`}
        >
          <div className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Profile name"
                className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm text-gray-950"
              />
              <button type="button" onClick={saveCurrentProfile} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white">
                <Save className="h-4 w-4" aria-hidden="true" /> Save current
              </button>
            </div>

            {savedProfiles.length > 0 ? (
              <div className="grid gap-2">
                {savedProfiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <button type="button" onClick={() => applyProfile(profile)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold text-gray-950">{profile.name}</span>
                      <span className="block text-xs text-gray-500">{profile.settings.theme} · {profile.settings.layout.visualizerLayers.length} layer{profile.settings.layout.visualizerLayers.length === 1 ? "" : "s"}</span>
                    </button>
                    <button type="button" onClick={() => storeProfiles(savedProfiles.filter((item) => item.id !== profile.id))} className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:text-red-700" aria-label={`Delete ${profile.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-600">No profiles saved yet.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!savedProfiles.length} onClick={downloadProfiles} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">
                <Download className="h-4 w-4" aria-hidden="true" /> Download profiles
              </button>
              <button type="button" onClick={() => profileUploadRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <Upload className="h-4 w-4" aria-hidden="true" /> Import profiles
              </button>
              <input ref={profileUploadRef} type="file" accept="application/json,.json" onChange={(event) => void importProfiles(event.target.files?.[0] ?? null)} className="hidden" />
            </div>
            <p className="text-xs text-gray-500">Profiles include visual settings only. Audio, images, song details, and API credentials are excluded.</p>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Reactive Timeline"
          category="Animation"
          className="order-5"
          description="Auto mode changes motion and effects across song sections."
          summary={
            visualMode === "auto"
              ? `${reactiveTimeline.zones.length} ${reactiveTimeline.mode} zones`
              : "Available in Auto mode"
          }
        >
          <ReactiveArrangementEditor
            visualMode={visualMode}
            timeline={reactiveTimeline}
            duration={duration}
            currentTime={currentTime}
            onSeek={seek}
            onZonesChange={onReactiveZonesChange}
            onResetAutomatic={onResetReactiveTimeline}
          />
        </CollapsibleCard>

        <CollapsibleCard
          title="Video Theme"
          category="Design"
          className="order-2"
          description="Controls layout, overlay strength, and title motion."
          summary={`${selectedTheme.label}: ${selectedTheme.description}`}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Theme
            <select
              value={videoTheme}
              onChange={(e) => setVideoTheme(e.target.value as VideoTheme)}
              className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
            >
              {Object.entries(VIDEO_THEME_PRESETS).map(([theme, preset]) => (
                <option key={theme} value={theme}>
                  {preset.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-gray-500">
              {selectedTheme.description}
            </span>
          </label>
        </CollapsibleCard>

        <CollapsibleCard
          title="Visualizer Layers"
          category="Canvas"
          className="order-6"
          description="Combine and position up to four independent visualizers."
          summary={`${layout.visualizerLayers.length} visualizer layer${layout.visualizerLayers.length === 1 ? "" : "s"}`}
        >
          <div className="grid gap-3">
            {layout.visualizerLayers.map((layer) => (
              <div key={layer.id} className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layer.enabled}
                      onChange={(event) => updateVisualizerLayer(layer.id, { enabled: event.target.checked })}
                      aria-label={`Show ${layer.name}`}
                    />
                    <input
                      type="text"
                      value={layer.name}
                      onChange={(event) => updateVisualizerLayer(layer.id, { name: event.target.value })}
                      className="min-w-0 rounded border px-2 py-1 text-sm font-semibold text-gray-950"
                    />
                  </div>
                  {layout.visualizerLayers.length > 1 && (
                    <button type="button" onClick={() => setLayout((current) => ({ ...current, visualizerLayers: current.visualizerLayers.filter((item) => item.id !== layer.id) }))} className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:text-red-700" aria-label={`Remove ${layer.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-xs font-medium text-gray-600">
                    Visualizer
                    <select value={layer.preset} onChange={(event) => updateVisualizerLayer(layer.id, { preset: event.target.value as typeof layer.preset })} className="rounded-lg border px-2 py-2 text-sm text-gray-950">
                      <option value="active">Follow active preset</option>
                      {VISUALIZER_PRESETS.map((preset) => <option key={preset} value={preset}>{VISUAL_PRESET_LABELS[preset]}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-gray-600">
                    Position
                    <select value={layer.position} onChange={(event) => updateVisualizerLayer(layer.id, { position: event.target.value as OverlayPosition })} className="rounded-lg border px-2 py-2 text-sm text-gray-950">
                      {OVERLAY_POSITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-gray-600">
                    Color
                    <div className="flex h-[38px] items-center gap-2 rounded-lg border bg-white px-2">
                      <input type="color" value={layer.color ?? visualizerColor} onChange={(event) => updateVisualizerLayer(layer.id, { color: event.target.value })} className="h-7 w-9 border-0 bg-transparent p-0" />
                      <span className="text-xs text-gray-500">Layer color</span>
                    </div>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["offsetX", "X offset", -900, 900, 10],
                    ["offsetY", "Y offset", -600, 600, 10],
                    ["scaleX", "Width", 0.1, 4, 0.05],
                    ["scaleY", "Height", 0.1, 4, 0.05],
                    ["rotation", "Rotation", -180, 180, 1],
                    ["opacity", "Opacity", 0.1, 1, 0.05],
                    ["reactivity", "Reactivity", 0.25, 3, 0.05],
                  ] as const).map(([key, label, min, max, step]) => (
                    <label key={key} className="grid gap-1 text-xs font-medium text-gray-600">
                      {label} {key.startsWith("scale") || key === "opacity" || key === "reactivity" ? `${Math.round(layer[key] * 100)}%` : key === "rotation" ? `${layer[key]}deg` : `${layer[key]}px`}
                      <input type="range" min={min} max={max} step={step} value={layer[key]} onChange={(event) => updateVisualizerLayer(layer.id, { [key]: Number(event.target.value) })} />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={layout.visualizerLayers.length >= 4}
              onClick={() => setLayout((current) => ({
                ...current,
                visualizerLayers: [...current.visualizerLayers, {
                  id: `visualizer-${Date.now()}`,
                  name: `Visualizer ${current.visualizerLayers.length + 1}`,
                  enabled: true,
                  preset: current.visualizerLayers.length % 2 ? "radial" : "waveform",
                  color: null,
                  position: current.visualizerLayers.length % 2 ? "center-right" : "top-center",
                  offsetX: 0,
                  offsetY: 0,
                  scaleX: 0.65,
                  scaleY: 0.65,
                  rotation: 0,
                  opacity: 0.9,
                  reactivity: 1,
                }],
              }))}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-cyan-700 bg-white px-3 py-2 text-sm font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add visualizer
            </button>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Canvas & Overlays"
          category="Canvas"
          className="order-7"
          description="Frame the background and position title and playback progress."
          summary={`${Math.round(layout.backgroundScale * 100)}% background, ${layout.titlePosition} title, ${layout.progressPosition} progress`}
        >
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-lg border bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-950">
                  Background Frame
                </p>
                <button
                  type="button"
                  onClick={() => setLayout(DEFAULT_VIDEO_LAYOUT)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
                >
                  Reset layout
                </button>
              </div>

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Zoom {Math.round(layout.backgroundScale * 100)}%
                <input
                  type="range"
                  min={1}
                  max={1.5}
                  step={0.01}
                  value={layout.backgroundScale}
                  onChange={(event) =>
                    updateLayout("backgroundScale", Number(event.target.value))
                  }
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Horizontal offset {layout.backgroundOffsetX}px
                  <input
                    type="range"
                    min={-240}
                    max={240}
                    step={5}
                    value={layout.backgroundOffsetX}
                    onChange={(event) =>
                      updateLayout(
                        "backgroundOffsetX",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Vertical offset {layout.backgroundOffsetY}px
                  <input
                    type="range"
                    min={-160}
                    max={160}
                    step={5}
                    value={layout.backgroundOffsetY}
                    onChange={(event) =>
                      updateLayout(
                        "backgroundOffsetY",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-950">Title Overlay</p>
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Title position
                <select
                  value={layout.titlePosition}
                  onChange={(event) =>
                    updateLayout(
                      "titlePosition",
                      event.target.value as OverlayPosition
                    )
                  }
                  className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                >
                  {OVERLAY_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Title X offset {layout.titleOffsetX}px
                <input
                  type="range"
                  min={-900}
                  max={900}
                  step={5}
                  value={layout.titleOffsetX}
                  onChange={(event) =>
                    updateLayout("titleOffsetX", Number(event.target.value))
                  }
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Title Y offset {layout.titleOffsetY}px
                <input
                  type="range"
                  min={-600}
                  max={600}
                  step={5}
                  value={layout.titleOffsetY}
                  onChange={(event) =>
                    updateLayout("titleOffsetY", Number(event.target.value))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
                Title rotation {layout.titleRotation}deg
                <input type="range" min={-180} max={180} step={1} value={layout.titleRotation} onChange={(event) => updateLayout("titleRotation", Number(event.target.value))} />
              </label>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-950">
                  Progress Bar
                </p>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={layout.showProgress}
                    onChange={(event) =>
                      updateLayout("showProgress", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Show
                </label>
              </div>

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Progress position
                <select
                  value={layout.progressPosition}
                  onChange={(event) =>
                    updateLayout(
                      "progressPosition",
                      event.target.value as OverlayPosition
                    )
                  }
                  className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                >
                  {OVERLAY_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Progress bar color
                <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
                  <input type="color" value={visualizerColor} onChange={(event) => updateProgressColor(event.target.value)} className="h-8 w-12 cursor-pointer border-0 bg-transparent p-0" />
                  <span className="font-mono text-xs text-gray-700">{visualizerColor}</span>
                </div>
              </label>

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Progress style
                <select
                  value={layout.progressStyle ?? "solid"}
                  onChange={(event) => updateLayout("progressStyle", event.target.value as ProgressStyle)}
                  className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                >
                  {progressStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Progress X offset {layout.progressOffsetX}px
                  <input
                    type="range"
                    min={-360}
                    max={360}
                    step={5}
                    value={layout.progressOffsetX}
                    onChange={(event) =>
                      updateLayout(
                        "progressOffsetX",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Progress Y offset {layout.progressOffsetY}px
                  <input
                    type="range"
                    min={-260}
                    max={260}
                    step={5}
                    value={layout.progressOffsetY}
                    onChange={(event) =>
                      updateLayout(
                        "progressOffsetY",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
                  Progress width {layout.progressWidth}px
                  <input
                    type="range"
                    min={360}
                    max={1600}
                    step={20}
                    value={layout.progressWidth}
                  onChange={(event) =>
                      updateLayout("progressWidth", Number(event.target.value))
                    }
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
                  Progress height {layout.progressHeight ?? 12}px
                  <input type="range" min={2} max={48} step={1} value={layout.progressHeight ?? 12} onChange={(event) => updateLayout("progressHeight", Number(event.target.value))} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
                  Progress rotation {layout.progressRotation}deg
                  <input type="range" min={-180} max={180} step={1} value={layout.progressRotation} onChange={(event) => updateLayout("progressRotation", Number(event.target.value))} />
                </label>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-950">Video Timer</p>
                  <p className="text-xs text-gray-500">Position the elapsed and total time separately from the bar.</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={layout.showProgressTime}
                    onChange={(event) => updateLayout("showProgressTime", event.target.checked)}
                    className="h-4 w-4"
                  />
                  Show
                </label>
              </div>

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Timer position
                <select
                  value={layout.progressTimePosition}
                  onChange={(event) => updateLayout("progressTimePosition", event.target.value as OverlayPosition)}
                  className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                >
                  {OVERLAY_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Timer X offset {layout.progressTimeOffsetX}px
                  <input type="range" min={-900} max={900} step={10} value={layout.progressTimeOffsetX} onChange={(event) => updateLayout("progressTimeOffsetX", Number(event.target.value))} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Timer Y offset {layout.progressTimeOffsetY}px
                  <input type="range" min={-600} max={600} step={10} value={layout.progressTimeOffsetY} onChange={(event) => updateLayout("progressTimeOffsetY", Number(event.target.value))} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
                  Timer rotation {layout.progressTimeRotation}deg
                  <input type="range" min={-180} max={180} step={1} value={layout.progressTimeRotation} onChange={(event) => updateLayout("progressTimeRotation", Number(event.target.value))} />
                </label>
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Captions"
          category="Text"
          className="order-8"
          description="Add timed lyric lines or automatic beat/drop callouts."
          summary={captionSummary}
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border text-sm">
              {captionModeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateCaptions("mode", option.value)}
                  className={[
                    "px-3 py-2 font-medium",
                    captions.mode === option.value
                      ? "bg-gray-950 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {captions.mode === "lyrics" && (
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Lyrics
                <textarea
                  value={captions.lyricsText}
                  onChange={(event) =>
                    updateCaptions("lyricsText", event.target.value)
                  }
                  placeholder={"Paste one lyric line per line.\nLines are spread across the song for now."}
                  rows={7}
                  className="min-h-36 rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                />
                <span className="text-xs font-normal text-gray-500">
                  {lyricLineCount} lines detected. This V1 distributes them
                  evenly across the track.
                </span>
              </label>
            )}

            {captions.mode === "beat" && (
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
                Beat captions use the existing audio analysis to flash
                “BEAT” on strong onsets and “DROP” near detected drops.
              </div>
            )}

            {captions.mode !== "off" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium text-gray-700">
                    Caption position
                    <select
                      value={captions.position}
                      onChange={(event) =>
                        updateCaptions(
                          "position",
                          event.target.value as OverlayPosition
                        )
                      }
                      className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                    >
                      {OVERLAY_POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm font-medium text-gray-700">
                    Font size {captions.fontSize}px
                    <input
                      type="range"
                      min={28}
                      max={82}
                      step={2}
                      value={captions.fontSize}
                      onChange={(event) =>
                        updateCaptions("fontSize", Number(event.target.value))
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium text-gray-700">
                    Caption X offset {captions.offsetX}px
                    <input
                      type="range"
                      min={-260}
                      max={260}
                      step={5}
                      value={captions.offsetX}
                      onChange={(event) =>
                        updateCaptions("offsetX", Number(event.target.value))
                      }
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-medium text-gray-700">
                    Caption Y offset {captions.offsetY}px
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      value={captions.offsetY}
                      onChange={(event) =>
                      updateCaptions("offsetY", Number(event.target.value))
                    }
                  />
                </label>
                  <label className="grid gap-1 text-sm font-medium text-gray-700 sm:col-span-2">
                    Caption rotation {captions.rotation ?? 0}deg
                    <input type="range" min={-180} max={180} step={1} value={captions.rotation ?? 0} onChange={(event) => updateCaptions("rotation", Number(event.target.value))} />
                  </label>
                </div>

                {captions.mode === "beat" && (
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={captions.showBeatDrops}
                      onChange={(event) =>
                        updateCaptions("showBeatDrops", event.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    Show detected drop callouts
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => setCaptions(DEFAULT_VIDEO_CAPTIONS)}
                  className="w-fit rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                >
                  Reset captions
                </button>
              </>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Motion Presets"
          category="Animation"
          className="order-4"
          description="Manual controls can disable motion or effects when needed."
          summary={formatResolvedPresetSummary(displayedVisuals)}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-700">Visual mode</p>
            <p className="text-xs text-gray-500">
              Manual uses your selected presets. Random uses a stable seed.
              Auto follows the section-aware reactive arrangement. Choose
              Locked camera or None effects to disable those movements.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border text-sm">
            {visualModeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVisualMode(option.value)}
                className={`px-3 py-2 font-medium ${
                  visualMode === option.value
                    ? "bg-gray-950 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Visualizer
              <select
                value={visualizerPreset}
                disabled={!isManualMode}
                onChange={(e) =>
                  setVisualizerPreset(e.target.value as VisualizerPreset)
                }
                className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500"
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
                value={cameraPreset}
                disabled={!isManualMode}
                onChange={(e) => setCameraPreset(e.target.value as CameraPreset)}
                className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {CAMERA_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {VISUAL_PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Effects
              <select
                value={effectPreset}
                disabled={!isManualMode}
                onChange={(e) => setEffectPreset(e.target.value as EffectPreset)}
                className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {EFFECT_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {VISUAL_PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 rounded border bg-gray-50 p-3 text-xs text-gray-600">
            {/* LESSON CHECKPOINT:
                These are the effective presets. Manual, Random, and Auto all
                resolve to this same final shape before the renderer sees them.
            */}
            <p className="font-medium text-gray-800">
              Active: {formatResolvedPresetSummary(displayedVisuals)}
            </p>
            <p className="mt-1">{displayedVisuals.reason}</p>
            {visualMode === "random" && (
              <button
                type="button"
                onClick={onRandomizeVisuals}
                className="mt-3 rounded border bg-white px-3 py-2 font-medium text-gray-800 hover:bg-gray-100"
              >
                Roll new random presets
              </button>
            )}
          </div>
        </CollapsibleCard>

      </div>
    </div>
  );
}
