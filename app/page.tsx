"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { FileText, GripVertical, Music, Palette, RotateCcw, Sparkles } from "lucide-react";

import AudioUploader from "@/components/audio/AudioUploaderComponent";
import DetailUploader from "@/components/audio/DetailUploader";
import PlaybackControls from "@/components/audio/PlaybackControls";
import VisualDetails from "@/components/audio/VisualDetails";
import RemotionPreviewPanel from "@/components/remotion/RemotionPreviewPanel";
import DisclosureSection from "@/components/ui/DisclosureSection";
import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import SummaryGrid, { InfoRow } from "@/components/ui/SummaryGrid";
import WorkflowStepCard from "@/components/ui/WorkflowStepCard";
import AiProviderSettings from "@/components/ui/AiProviderSettings";
import InterfaceThemePicker, { type InterfaceTheme } from "@/components/ui/InterfaceThemePicker";
import ProductionSummaryPanel from "@/components/video/ProductionSummaryPanel";
import VideoExportManifestPanel from "@/components/video/VideoExportManifestPanel";
import VideoRenderActions from "@/components/video/VideoRenderActions";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { useBackgroundGeneration } from "@/hooks/useBackgroundGeneration";
import { usePreparedVideoAssets } from "@/hooks/usePreparedVideoAssets";
import { usePreviewTransport } from "@/hooks/usePreviewTransport";
import {
  buildGeneratedBackgroundDataUrl,
  DEFAULT_BACKGROUND_PRESET_ID,
  DEFAULT_BACKGROUND_PROMPT,
} from "@/lib/backgroundStudio";
import {
  buildVideoExportManifest,
  getVideoExportBlockingReasons,
  VIDEO_RENDER_FPS,
} from "@/lib/videoExportManifest";
import { buildAutoCreatorSetup } from "@/lib/autoCreatorSetup";
import {
  buildAutomaticReactiveTimeline,
  isValidReactiveTimeline,
} from "@/lib/reactiveArrangement";
import {
  clearSavedCreatorProject,
  loadSavedCreatorProject,
  saveCreatorProject,
  type PersistedCreatorProjectInput,
} from "@/lib/projectPersistence";
import {
  DEFAULT_VIDEO_LAYOUT,
  isDefaultVideoLayout,
  normalizeVideoLayout,
} from "@/lib/videoLayout";
import {
  DEFAULT_VIDEO_CAPTIONS,
  isDefaultVideoCaptions,
} from "@/lib/videoCaptions";
import {
  formatResolvedPresetSummary,
  resolveVisualPresets,
} from "@/lib/visualPresetSelection";
import type {
  AiProviderConnection,
  BackgroundPresetId,
  BackgroundPromptFields,
  BackgroundSource,
  CameraPreset,
  EffectPreset,
  ReactiveTimelineMode,
  ReactiveZone,
  VideoCaptionConfig,
  VideoLayoutConfig,
  VideoProject,
  VideoTheme,
  VisualMode,
  VisualizerPreset,
} from "@/types/videoProject";

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function formatFileSize(file: File | null) {
  if (!file) return "No file";

  return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

const DEFAULT_VIDEO_THEME: VideoTheme = "minimal";
const DEFAULT_VISUALIZER_COLOR = "#00FFFF";
const DEFAULT_VISUAL_MODE: VisualMode = "manual";
const DEFAULT_VISUALIZER_PRESET: VisualizerPreset = "minimal";
const DEFAULT_CAMERA_PRESET: CameraPreset = "float";
const DEFAULT_EFFECT_PRESET: EffectPreset = "glow";
const DEFAULT_RANDOM_SEED = 1;
const DEFAULT_BACKGROUND_SOURCE: BackgroundSource = "generated";
const DEFAULT_AI_CONNECTION: AiProviderConnection = {
  provider: "server",
  openAiApiKey: "",
  cloudflareAccountId: "",
  cloudflareApiToken: "",
};
type ProjectSaveStatus = "loading" | "empty" | "saving" | "saved" | "error";
type AutoSetupStatus = "waiting" | "running" | "applied" | "manual";
const INTERFACE_THEME_KEY = "music-video-interface-theme";

function subscribeToInterfaceTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("interface-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("interface-theme-change", callback);
  };
}

function getInterfaceTheme(): InterfaceTheme {
  const savedTheme = window.localStorage.getItem(INTERFACE_THEME_KEY);
  return savedTheme === "graphite" || savedTheme === "contrast" ? savedTheme : "studio";
}

export default function HomePage() {
  const creatorGridRef = useRef<HTMLDivElement>(null);
  const [editorWidth, setEditorWidth] = useState(680);
  const interfaceTheme = useSyncExternalStore(
    subscribeToInterfaceTheme,
    getInterfaceTheme,
    () => "studio" as InterfaceTheme
  );
  const setInterfaceTheme = (theme: InterfaceTheme) => {
    window.localStorage.setItem(INTERFACE_THEME_KEY, theme);
    window.dispatchEvent(new Event("interface-theme-change"));
  };
  //useState is where the single instance of the variables are first made
  //The values are then recviced via the "import" then displayed via the return of <AudioUploader /> etc.
  // 

  //LIFTED STATE ARCHITECTURE
  // AUDIO
  //UPDATING STATE VALUES NOTE:   
  //CANNOT DO                               setCount(count + 1);          
  //HAS TO BE functional updates            setCount((prev) => prev + 1)
  //REASONING: React updates variables in batches meaning it might not get the latest "count" value if doing multiple setCount(count + 1) 
  //           setCount((prev) => prev + 1) ensures you always get the latest "count"
  //STATE IS IMMUTABLE: 
  //IF ADDING TO STATE DON'T DO             count.name = "James";
  //CREATE NEW OBJECT INSTEAD               setCount({...count, name: "James"});
  //OR USE SPREAD OPERATOR                  setItems([...items, newItem]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  // Credentials are session-only and deliberately excluded from project saves.
  const [aiConnection, setAiConnection] = useState(DEFAULT_AI_CONNECTION);

  // TEXT
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");

  // IMAGES
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [backgroundSource, setBackgroundSource] =
    useState<BackgroundSource>(DEFAULT_BACKGROUND_SOURCE);
  const [backgroundPresetId, setBackgroundPresetId] =
    useState<BackgroundPresetId>(DEFAULT_BACKGROUND_PRESET_ID);
  const [backgroundPrompt, setBackgroundPrompt] =
    useState<BackgroundPromptFields>(DEFAULT_BACKGROUND_PROMPT);

  // STYLE
  const [videoTheme, setVideoTheme] =
    useState<VideoTheme>(DEFAULT_VIDEO_THEME);
  const [visualizerColor, setVisualizerColor] = useState(
    DEFAULT_VISUALIZER_COLOR
  );
  const [visualMode, setVisualMode] =
    useState<VisualMode>(DEFAULT_VISUAL_MODE);
  const [visualizerPreset, setVisualizerPreset] =
    useState<VisualizerPreset>(DEFAULT_VISUALIZER_PRESET);
  const [cameraPreset, setCameraPreset] =
    useState<CameraPreset>(DEFAULT_CAMERA_PRESET);
  const [effectPreset, setEffectPreset] =
    useState<EffectPreset>(DEFAULT_EFFECT_PRESET);
  const [randomSeed, setRandomSeed] = useState(DEFAULT_RANDOM_SEED);
  const [reactiveTimelineMode, setReactiveTimelineMode] =
    useState<ReactiveTimelineMode>("auto");
  const [customReactiveZones, setCustomReactiveZones] = useState<
    ReactiveZone[]
  >([]);
  const [videoLayout, setVideoLayout] =
    useState<VideoLayoutConfig>(DEFAULT_VIDEO_LAYOUT);
  const [videoCaptions, setVideoCaptions] =
    useState<VideoCaptionConfig>(DEFAULT_VIDEO_CAPTIONS);
  const hasStartedProjectRestore = useRef(false);
  const hasLoadedSavedProject = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [projectSaveStatus, setProjectSaveStatus] =
    useState<ProjectSaveStatus>("loading");
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);
  const [autoSetupStatus, setAutoSetupStatus] =
    useState<AutoSetupStatus>("manual");
  const [autoSetupSummary, setAutoSetupSummary] = useState(
    "Manual mode is active. Press Auto Director when you want generated setup."
  );

  const {
    analysis: audioAnalysis,
    isAnalyzing: isAnalyzingAudio,
    error: audioAnalysisError,
  } = useAudioAnalysis(audioFile);
  const {
    text: audioTranscriptionText,
    status: audioTranscriptionStatus,
    error: audioTranscriptionError,
    retry: retryAudioTranscription,
  } = useAudioTranscription(audioFile, {
    enabled: false,
    connection: aiConnection,
  });
  const duration = audioAnalysis?.durationSeconds ?? 0;
  const automaticReactiveTimeline = useMemo(
    () => buildAutomaticReactiveTimeline(audioAnalysis),
    [audioAnalysis]
  );
  const reactiveTimeline = useMemo(() => {
    if (
      reactiveTimelineMode === "custom" &&
      isValidReactiveTimeline(customReactiveZones, duration)
    ) {
      return {
        mode: "custom" as const,
        zones: customReactiveZones,
      };
    }

    return automaticReactiveTimeline;
  }, [
    automaticReactiveTimeline,
    customReactiveZones,
    duration,
    reactiveTimelineMode,
  ]);
  const {
    playerRef,
    play,
    pause,
    seek,
    isPlaying,
    currentTime,
    volume,
    setVolume,
  } = usePreviewTransport({
    duration,
    fps: VIDEO_RENDER_FPS,
    source: audioFile,
  });
  const localBackgroundUrl = useMemo(() => {
    return buildGeneratedBackgroundDataUrl({
      presetId: backgroundPresetId,
      prompt: backgroundPrompt,
    });
  }, [backgroundPresetId, backgroundPrompt]);
  const {
    generate: generateBackground,
    reset: resetBackgroundGeneration,
    useLocalTemplate,
    generatedDataUrl: generatedBackgroundUrl,
    generation: backgroundGeneration,
    hasAiBackground,
    isStale: isBackgroundGenerationStale,
    isGenerating: isGeneratingBackground,
    error: backgroundGenerationError,
    restoreGeneratedBackground,
  } = useBackgroundGeneration({
    presetId: backgroundPresetId,
    prompt: backgroundPrompt,
    localDataUrl: localBackgroundUrl,
    connection: aiConnection,
  });

  const videoProject = useMemo<VideoProject>(() => {
    return {
      metadata: {
        songTitle,
        artistName,
      },
      assets: {
        audioFile,
        backgroundImage,
        logoImage,
      },
      background: {
        source: backgroundSource,
        presetId: backgroundPresetId,
        prompt: backgroundPrompt,
        generatedDataUrl: generatedBackgroundUrl,
        generation: backgroundGeneration,
      },
      style: {
        theme: videoTheme,
        visualizerColor,
        visualMode,
        visualizerPreset,
        cameraPreset,
        effectPreset,
        randomSeed,
        reactiveTimeline,
        layout: videoLayout,
        captions: videoCaptions,
      },
      playback: {
        currentTime,
        duration,
        isPlaying,
      },
      audioAnalysis,
    };
  }, [
    audioAnalysis,
    artistName,
    audioFile,
    backgroundImage,
    backgroundPresetId,
    backgroundPrompt,
    backgroundSource,
    backgroundGeneration,
    cameraPreset,
    currentTime,
    duration,
    effectPreset,
    generatedBackgroundUrl,
    isPlaying,
    logoImage,
    randomSeed,
    reactiveTimeline,
    songTitle,
    videoCaptions,
    videoLayout,
    videoTheme,
    visualMode,
    visualizerColor,
    visualizerPreset,
  ]);

  const exportManifest = useMemo(() => {
    return buildVideoExportManifest(videoProject);
  }, [videoProject]);

  const exportBlockingReasons = useMemo(() => {
    return getVideoExportBlockingReasons(exportManifest);
  }, [exportManifest]);

  const preparedAssets = usePreparedVideoAssets(videoProject);
  const audioMissingItems = [
    !audioFile ? "Audio file" : null,
    audioFile && duration <= 0 ? "Duration" : null,
    audioFile && !audioAnalysis ? "Reactive analysis" : null,
  ].filter((item): item is string => item !== null);
  const trackMissingItems = [
    backgroundSource === "upload" && !backgroundImage
      ? "Background image"
      : null,
  ].filter((item): item is string => item !== null);
  const visualMissingItems: string[] = [];
  const isAudioStepReady = audioMissingItems.length === 0;
  const isTrackStepReady = trackMissingItems.length === 0;
  const isVisualStepReady = visualMissingItems.length === 0;
  const isExportReady = exportBlockingReasons.length === 0;
  const resolvedVisuals = useMemo(() => {
    return resolveVisualPresets({
      style: exportManifest.style,
      audioAnalysis,
    });
  }, [audioAnalysis, exportManifest.style]);
  const hasProjectContent =
    audioFile !== null ||
    backgroundImage !== null ||
    logoImage !== null ||
    songTitle.trim().length > 0 ||
    artistName.trim().length > 0 ||
    backgroundSource !== DEFAULT_BACKGROUND_SOURCE ||
    backgroundPresetId !== DEFAULT_BACKGROUND_PRESET_ID ||
    backgroundPrompt.mood !== DEFAULT_BACKGROUND_PROMPT.mood ||
    backgroundPrompt.scene !== DEFAULT_BACKGROUND_PROMPT.scene ||
    backgroundPrompt.colorDirection !== DEFAULT_BACKGROUND_PROMPT.colorDirection ||
    backgroundPrompt.avoid !== DEFAULT_BACKGROUND_PROMPT.avoid ||
    backgroundGeneration.provider !== "local" ||
    videoTheme !== DEFAULT_VIDEO_THEME ||
    visualizerColor !== DEFAULT_VISUALIZER_COLOR ||
    visualMode !== DEFAULT_VISUAL_MODE ||
    visualizerPreset !== DEFAULT_VISUALIZER_PRESET ||
    cameraPreset !== DEFAULT_CAMERA_PRESET ||
    effectPreset !== DEFAULT_EFFECT_PRESET ||
    randomSeed !== DEFAULT_RANDOM_SEED ||
    reactiveTimelineMode !== "auto" ||
    !isDefaultVideoLayout(videoLayout) ||
    !isDefaultVideoCaptions(videoCaptions);
  const persistenceSnapshot = useMemo<PersistedCreatorProjectInput>(
    () => ({
      metadata: {
        songTitle,
        artistName,
      },
      assets: {
        audioFile,
        backgroundImage,
        logoImage,
      },
      background: {
        source: backgroundSource,
        presetId: backgroundPresetId,
        prompt: backgroundPrompt,
        generatedDataUrl: generatedBackgroundUrl,
        generation: backgroundGeneration,
      },
      style: {
        theme: videoTheme,
        visualizerColor,
        visualMode,
        visualizerPreset,
        cameraPreset,
        effectPreset,
        randomSeed,
        reactiveTimelineMode,
        customReactiveZones,
        layout: videoLayout,
        captions: videoCaptions,
      },
    }),
    [
      artistName,
      audioFile,
      backgroundGeneration,
      backgroundImage,
      backgroundPresetId,
      backgroundPrompt,
      backgroundSource,
      cameraPreset,
      customReactiveZones,
      effectPreset,
      generatedBackgroundUrl,
      logoImage,
      randomSeed,
      reactiveTimelineMode,
      songTitle,
      videoCaptions,
      videoLayout,
      videoTheme,
      visualMode,
      visualizerColor,
      visualizerPreset,
    ]
  );
  const projectSaveLabel = useMemo(() => {
    if (projectSaveStatus === "loading") return "Loading saved project";
    if (projectSaveStatus === "saving") return "Saving project";
    if (projectSaveStatus === "saved") return "Project saved";
    if (projectSaveStatus === "error") return "Save issue";
    return "No saved draft";
  }, [projectSaveStatus]);
  const projectSaveTone =
    projectSaveStatus === "error"
      ? "error"
      : projectSaveStatus === "saving" || projectSaveStatus === "loading"
        ? "working"
        : projectSaveStatus === "saved"
          ? "success"
          : "waiting";
  const applyAutoCreatorSetup = useCallback(
    async () => {
      if (!audioFile || !audioAnalysis) return;

      setAutoSetupStatus("running");
      setAutoSetupSummary(
        "Auto Director is reading the track and choosing a starting setup."
      );

      let lyricsText = audioTranscriptionText || videoCaptions.lyricsText;
      let usedLocalFallback = false;

      // Lyrics make captions smarter, but Auto Director can still work from
      // local audio analysis when OpenAI transcription is unavailable.
      if (!lyricsText.trim()) {
        const transcribedText = await retryAudioTranscription();
        if (transcribedText) {
          lyricsText = transcribedText;
        } else {
          usedLocalFallback = true;
        }
      }

      const setup = buildAutoCreatorSetup({
        fileName: audioFile.name,
        audioAnalysis,
        lyricsText,
      });

      pause();
      setSongTitle(setup.trackInfo.songTitle);
      setArtistName(setup.trackInfo.artistName);
      setBackgroundSource("generated");
      setBackgroundPresetId(setup.background.presetId);
      setBackgroundPrompt(setup.background.prompt);
      resetBackgroundGeneration();
      setVideoTheme(setup.style.theme);
      setVisualizerColor(setup.style.visualizerColor);
      setVisualMode(setup.style.visualMode);
      setVisualizerPreset(setup.style.visualizerPreset);
      setCameraPreset(setup.style.cameraPreset);
      setEffectPreset(setup.style.effectPreset);
      setRandomSeed(setup.style.randomSeed);
      setVideoLayout(setup.style.layout);
      setVideoCaptions(setup.style.captions);
      setReactiveTimelineMode("auto");
      setCustomReactiveZones([]);
      setAutoSetupStatus("applied");
      setAutoSetupSummary(
        usedLocalFallback
          ? `${setup.summary} Lyrics transcription was unavailable, so it used local audio analysis only.`
          : setup.summary
      );
    },
    [
      audioAnalysis,
      audioFile,
      audioTranscriptionText,
      pause,
      resetBackgroundGeneration,
      retryAudioTranscription,
      videoCaptions.lyricsText,
    ]
  );

  useEffect(() => {
    if (hasStartedProjectRestore.current) return;

    hasStartedProjectRestore.current = true;
    let isCancelled = false;

    async function restoreSavedProject() {
      try {
        const savedProject = await loadSavedCreatorProject();

        if (isCancelled) return;

        if (savedProject) {
          pause();
          setAudioFile(savedProject.assets.audioFile);
          setSongTitle(savedProject.metadata.songTitle);
          setArtistName(savedProject.metadata.artistName);
          setBackgroundImage(savedProject.assets.backgroundImage);
          setLogoImage(savedProject.assets.logoImage);
          setBackgroundSource(savedProject.background.source);
          setBackgroundPresetId(savedProject.background.presetId);
          setBackgroundPrompt(savedProject.background.prompt);
          restoreGeneratedBackground({
            dataUrl: savedProject.background.generatedDataUrl,
            generation: savedProject.background.generation,
            restoredPresetId: savedProject.background.presetId,
            restoredPrompt: savedProject.background.prompt,
          });
          setVideoTheme(savedProject.style.theme);
          setVisualizerColor(savedProject.style.visualizerColor);
          setVisualMode(savedProject.style.visualMode);
          setVisualizerPreset(savedProject.style.visualizerPreset);
          setCameraPreset(savedProject.style.cameraPreset);
          setEffectPreset(savedProject.style.effectPreset);
          setRandomSeed(savedProject.style.randomSeed);
          setReactiveTimelineMode(savedProject.style.reactiveTimelineMode);
          setCustomReactiveZones(savedProject.style.customReactiveZones);
          setVideoLayout(normalizeVideoLayout(savedProject.style.layout));
          setVideoCaptions(
            savedProject.style.captions ?? DEFAULT_VIDEO_CAPTIONS
          );
          setProjectSaveStatus("saved");
        } else {
          setProjectSaveStatus("empty");
        }

        setProjectSaveError(null);
      } catch (error) {
        if (isCancelled) return;

        setProjectSaveStatus("error");
        setProjectSaveError(
          error instanceof Error
            ? error.message
            : "Unable to load the saved project."
        );
      } finally {
        if (!isCancelled) {
          hasLoadedSavedProject.current = true;
        }
      }
    }

    void restoreSavedProject();

    return () => {
      isCancelled = true;
    };
  }, [pause, restoreGeneratedBackground]);

  useEffect(() => {
    if (!hasLoadedSavedProject.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    if (!hasProjectContent) {
      saveTimerRef.current = setTimeout(() => {
        void clearSavedCreatorProject()
          .then(() => {
            setProjectSaveStatus("empty");
            setProjectSaveError(null);
          })
          .catch((error) => {
            setProjectSaveStatus("error");
            setProjectSaveError(
              error instanceof Error
                ? error.message
                : "Unable to clear the saved project."
            );
          });
      }, 300);
      return;
    }

    saveTimerRef.current = setTimeout(() => {
      setProjectSaveStatus("saving");
      setProjectSaveError(null);
      void saveCreatorProject(persistenceSnapshot)
        .then(() => {
          setProjectSaveStatus("saved");
          setProjectSaveError(null);
        })
        .catch((error) => {
          setProjectSaveStatus("error");
          setProjectSaveError(
            error instanceof Error
              ? error.message
              : "Unable to save the project locally."
          );
        });
    }, 700);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasProjectContent, persistenceSnapshot]);

  const handleAudioFileChange = useCallback(
    (nextAudioFile: File | null) => {
      pause();
      setAudioFile(nextAudioFile);
      setAutoSetupStatus(nextAudioFile ? "manual" : "waiting");
      setAutoSetupSummary(
        nextAudioFile
          ? "Audio loaded. Existing visuals are unchanged; press Auto Director only if you want generated setup."
          : "Drop in audio, then press Auto Director if you want generated setup."
      );
    },
    [pause]
  );
  const handleReactiveZonesChange = useCallback(
    (zones: ReactiveZone[]) => {
      if (!isValidReactiveTimeline(zones, duration)) return;

      setCustomReactiveZones(zones);
      setReactiveTimelineMode("custom");
    },
    [duration]
  );
  const resetReactiveTimeline = useCallback(() => {
    setCustomReactiveZones([]);
    setReactiveTimelineMode("auto");
  }, []);
  const resetProject = useCallback(() => {
    if (!hasProjectContent) return;

    const shouldReset = window.confirm(
      "Clear the current project and start over?"
    );

    if (!shouldReset) return;

    pause();
    setAudioFile(null);
    setSongTitle("");
    setArtistName("");
    setBackgroundImage(null);
    setBackgroundSource(DEFAULT_BACKGROUND_SOURCE);
    setBackgroundPresetId(DEFAULT_BACKGROUND_PRESET_ID);
    setBackgroundPrompt(DEFAULT_BACKGROUND_PROMPT);
    resetBackgroundGeneration();
    setLogoImage(null);
    setVideoTheme(DEFAULT_VIDEO_THEME);
    setVisualizerColor(DEFAULT_VISUALIZER_COLOR);
    setVisualMode(DEFAULT_VISUAL_MODE);
    setVisualizerPreset(DEFAULT_VISUALIZER_PRESET);
    setCameraPreset(DEFAULT_CAMERA_PRESET);
    setEffectPreset(DEFAULT_EFFECT_PRESET);
    setRandomSeed(DEFAULT_RANDOM_SEED);
    setVideoLayout(DEFAULT_VIDEO_LAYOUT);
    setVideoCaptions(DEFAULT_VIDEO_CAPTIONS);
    setAutoSetupStatus("manual");
    setAutoSetupSummary(
      "Manual mode is active. Press Auto Director when you want generated setup."
    );
    resetReactiveTimeline();
  }, [
    hasProjectContent,
    pause,
    resetBackgroundGeneration,
    resetReactiveTimeline,
  ]);

  // Here is how we pass states we make here into the "types" from other files
  const beginColumnResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const grid = creatorGridRef.current;
    if (!grid) return;

    const resize = (pointerEvent: PointerEvent) => {
      const bounds = grid.getBoundingClientRect();
      const nextWidth = pointerEvent.clientX - bounds.left;
      setEditorWidth(Math.min(Math.max(nextWidth, 440), bounds.width - 410));
    };
    const stop = () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stop);
  };

  return (
    <main data-ui-theme={interfaceTheme} className="app-shell min-h-screen px-4 py-5 text-gray-950 sm:px-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
        <header className="app-header flex flex-col gap-4 rounded-lg px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-700">
              AI Music Video Generator
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
              Create a YouTube-ready music video
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Follow the steps, review the preview, then export the final MP4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InterfaceThemePicker
              value={interfaceTheme}
              onChange={setInterfaceTheme}
            />
            <button
              type="button"
              disabled={!hasProjectContent}
              onClick={resetProject}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-cyan-300 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </button>
            <StatusPill
              label={projectSaveLabel}
              tone={projectSaveTone}
              className={projectSaveStatus === "loading" ? "project-loading-status" : ""}
            />
            <StatusPill
              label={isExportReady ? "Ready to export" : "Needs input"}
              tone={isExportReady ? "ready" : "waiting"}
            />
            <StatusPill
              label={
                audioAnalysis
                  ? `${audioAnalysis.dropTimes.length} drop markers`
                  : "Analysis pending"
              }
              tone={audioAnalysis ? "success" : "waiting"}
            />
          </div>
        </header>

        <div
          ref={creatorGridRef}
          className="creator-grid grid gap-5 lg:h-[calc(100vh-10.5rem)] lg:min-h-[680px] lg:gap-0 lg:overflow-hidden"
          style={{ "--editor-width": `${editorWidth}px` } as CSSProperties}
        >
          <section className="workspace-column editor-column min-w-0 overflow-x-hidden flex flex-col gap-4 lg:h-full lg:overflow-y-auto lg:pr-3">
            <Panel className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white">
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-950">
                    Guided setup
                  </p>
                  <p className="text-sm text-gray-600">
                    Complete the essentials in order. Optional branding can be
                    added as you go.
                  </p>
                </div>
              </div>
            </Panel>

            {projectSaveError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {projectSaveError}
              </p>
            )}

            <AiProviderSettings
              connection={aiConnection}
              onChange={setAiConnection}
            />

            <WorkflowStepCard
              stepNumber={1}
              initialOpen={false}
              title="Audio Setup"
              description="Upload or replace the track used for timing, analysis, and export."
              icon={Music}
              isReady={isAudioStepReady}
              missingItems={audioMissingItems}
              completedSummary={
                <>
                  <span className="font-medium text-gray-950">
                    {audioFile?.name ?? "No audio selected"}
                  </span>
                  <span className="ml-2 text-gray-500">
                    {formatDuration(duration)}
                  </span>
                </>
              }
            >
              <AudioUploader
                audioFile={audioFile}
                setAudioFile={handleAudioFileChange}
              />

              <div className="info-callout mt-4 rounded-lg border border-cyan-100 bg-cyan-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cyan-950">
                      Auto Director
                    </p>
                    <p className="mt-1 text-sm text-cyan-900">
                      {autoSetupSummary}
                    </p>
                  </div>
                  <StatusPill
                    label={
                      autoSetupStatus === "running"
                        ? "Running"
                        : autoSetupStatus === "applied"
                          ? "Auto setup applied"
                          : autoSetupStatus === "manual"
                            ? "Manual mode"
                            : "Waiting"
                    }
                    tone={
                      autoSetupStatus === "running"
                        ? "working"
                        : autoSetupStatus === "applied"
                          ? "success"
                          : "waiting"
                    }
                  />
                </div>
                {audioFile && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusPill
                      label={
                        audioTranscriptionStatus === "transcribing"
                          ? "Transcribing lyrics"
                          : audioTranscriptionStatus === "succeeded"
                            ? "Lyrics ready"
                            : audioTranscriptionStatus === "unavailable"
                              ? "Lyrics unavailable"
                              : audioTranscriptionStatus === "failed"
                                ? "Lyrics failed"
                                : "Lyrics optional"
                      }
                      tone={
                        audioTranscriptionStatus === "transcribing"
                          ? "working"
                          : audioTranscriptionStatus === "succeeded"
                            ? "success"
                            : audioTranscriptionStatus === "failed"
                              ? "error"
                              : "waiting"
                      }
                    />
                    {audioTranscriptionStatus === "succeeded" && (
                      <span className="text-xs text-cyan-900">
                        {
                          audioTranscriptionText.split(/\s+/).filter(Boolean)
                            .length
                        }{" "}
                        words
                      </span>
                    )}
                    {audioTranscriptionError &&
                      audioTranscriptionStatus !== "unavailable" && (
                        <span className="text-xs text-red-700">
                          {audioTranscriptionError}
                        </span>
                      )}
                    {audioTranscriptionStatus === "failed" && (
                      <button
                        type="button"
                        onClick={() => void retryAudioTranscription()}
                        className="rounded-lg border border-cyan-700 bg-white px-2 py-1 text-xs font-medium text-cyan-900"
                      >
                        Retry lyrics
                      </button>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  disabled={
                    !audioFile ||
                    !audioAnalysis ||
                    autoSetupStatus === "running" ||
                    audioTranscriptionStatus === "transcribing"
                  }
                  onClick={() => void applyAutoCreatorSetup()}
                  className="mt-3 rounded-lg border border-cyan-700 bg-white px-3 py-2 text-sm font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {autoSetupStatus === "running" ||
                  audioTranscriptionStatus === "transcribing"
                    ? "Running Auto Director..."
                    : "Run Auto Director"}
                </button>
              </div>

              <div className="mt-4">
                <SummaryGrid>
                  <InfoRow label="File" value={audioFile?.name ?? "No audio"} />
                  <InfoRow label="Size" value={formatFileSize(audioFile)} />
                  <InfoRow label="Duration" value={formatDuration(duration)} />
                  <InfoRow
                    label="Analysis"
                    value={
                      isAnalyzingAudio
                        ? "Analyzing..."
                        : audioAnalysis
                          ? `${audioAnalysis.points.length} points`
                          : "Waiting"
                    }
                  />
                </SummaryGrid>
              </div>

              {audioAnalysisError && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {audioAnalysisError}
                </p>
              )}
            </WorkflowStepCard>

            <WorkflowStepCard
              stepNumber={2}
              title="Track & Branding"
              description="Add track information, artwork, and your logo."
              icon={FileText}
              isReady={isTrackStepReady}
              missingItems={trackMissingItems}
              completedSummary={
                <>
                  <span className="font-medium text-gray-950">
                    {artistName || "No artist"}
                  </span>
                  <span className="mx-1 text-gray-400">-</span>
                  <span>{songTitle || "No title"}</span>
                  <span className="ml-2 text-gray-500">
                    {backgroundSource === "upload"
                      ? backgroundImage
                        ? "Background attached"
                        : "Background missing"
                      : backgroundGeneration.provider === "openai"
                        ? "AI background"
                        : "Generated background"}
                  </span>
                </>
              }
            >
              <DetailUploader
                songTitle={songTitle}
                setSongTitle={setSongTitle}
                artistName={artistName}
                setArtistName={setArtistName}
                logoImage={logoImage}
                setLogoImage={setLogoImage}
                backgroundImage={backgroundImage}
                setBackgroundImage={setBackgroundImage}
                backgroundSource={backgroundSource}
                setBackgroundSource={setBackgroundSource}
                backgroundPresetId={backgroundPresetId}
                setBackgroundPresetId={setBackgroundPresetId}
                backgroundPrompt={backgroundPrompt}
                setBackgroundPrompt={setBackgroundPrompt}
                generatedBackgroundUrl={generatedBackgroundUrl}
                generationProvider={backgroundGeneration.provider}
                hasAiBackground={hasAiBackground}
                isGeneratingBackground={isGeneratingBackground}
                isGenerationStale={isBackgroundGenerationStale}
                generationError={backgroundGenerationError}
                onGenerateBackground={async () => {
                  setBackgroundSource("generated");
                  await generateBackground();
                }}
                onUseLocalTemplate={useLocalTemplate}
                showTitle={false}
                surface="plain"
              />
            </WorkflowStepCard>

            <WorkflowStepCard
              stepNumber={3}
              title="Visual Design"
              description="Choose the theme, overlays, visualizers, and motion."
              icon={Palette}
              isReady={isVisualStepReady}
              missingItems={visualMissingItems}
              completedSummary={
                <>
                  <span className="font-medium text-gray-950">
                    {videoTheme}
                  </span>
                  <span className="mx-1 text-gray-400">-</span>
                  <span>{formatResolvedPresetSummary(resolvedVisuals)}</span>
                  {visualMode === "auto" && (
                    <span className="ml-2 text-gray-500">
                      {reactiveTimeline.zones.length} zones
                    </span>
                  )}
                </>
              }
            >
              <VisualDetails
                videoTheme={videoTheme}
                setVideoTheme={setVideoTheme}
                visualizerColor={visualizerColor}
                setVisualizerColor={setVisualizerColor}
                visualMode={visualMode}
                setVisualMode={setVisualMode}
                visualizerPreset={visualizerPreset}
                setVisualizerPreset={setVisualizerPreset}
                cameraPreset={cameraPreset}
                setCameraPreset={setCameraPreset}
                effectPreset={effectPreset}
                setEffectPreset={setEffectPreset}
                randomSeed={randomSeed}
                onRandomizeVisuals={() => setRandomSeed(Date.now())}
                layout={videoLayout}
                setLayout={setVideoLayout}
                captions={videoCaptions}
                setCaptions={setVideoCaptions}
                reactiveTimeline={reactiveTimeline}
                duration={duration}
                currentTime={currentTime}
                seek={seek}
                onReactiveZonesChange={handleReactiveZonesChange}
                onResetReactiveTimeline={resetReactiveTimeline}
                audioAnalysis={audioAnalysis}
                showTitle={false}
                surface="plain"
              />
            </WorkflowStepCard>
          </section>

          <button
            type="button"
            onPointerDown={beginColumnResize}
            className="column-resizer hidden lg:flex"
            aria-label="Resize editor and preview columns"
            title="Drag to resize columns"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>

          <section className="workspace-column preview-column min-w-0 flex flex-col gap-4 lg:h-full lg:overflow-y-auto lg:pl-3 lg:pr-1">
            <RemotionPreviewPanel
              manifest={exportManifest}
              preparedAssets={preparedAssets}
              blockingReasons={exportBlockingReasons}
              playerRef={playerRef}
            />

            <PlaybackControls
              audioFile={audioFile}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              play={play}
              pause={pause}
              seek={seek}
              volume={volume}
              setVolume={setVolume}
              showDetailedControls={false}
            />

            <VideoRenderActions
              manifest={exportManifest}
              preparedAssets={preparedAssets}
              assetFiles={videoProject.assets}
              blockingReasons={exportBlockingReasons}
              currentTime={currentTime}
            />

            <ProductionSummaryPanel
              manifest={exportManifest}
              blockingReasons={exportBlockingReasons}
            />
          </section>
        </div>

        <DisclosureSection
          title="Advanced Export Details"
          description="Inspect the render manifest and technical export data."
        >
          <div className="grid gap-4">
            <div className="lg:col-span-2">
              <VideoExportManifestPanel
                manifest={exportManifest}
                blockingReasons={exportBlockingReasons}
              />
            </div>
          </div>
        </DisclosureSection>
      </div>
    </main>
  );
}
