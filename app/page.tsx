"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Captions, Code2, FileText, GripVertical, Music, Palette, RotateCcw, Save, Settings2 } from "lucide-react";
import { getProjectSnapshotKey } from "@/lib/projectSnapshotKey";

import AudioUploader from "@/components/audio/AudioUploaderComponent";
import DetailUploader from "@/components/audio/DetailUploader";
import PlaybackControls from "@/components/audio/PlaybackControls";
import VisualDetails from "@/components/audio/VisualDetails";
import RemotionPreviewPanel from "@/components/remotion/RemotionPreviewPanel";
import DisclosureSection from "@/components/ui/DisclosureSection";
import StatusPill from "@/components/ui/StatusPill";
import SummaryGrid, { InfoRow } from "@/components/ui/SummaryGrid";
import WorkflowStepCard from "@/components/ui/WorkflowStepCard";
import AiProviderSettings from "@/components/ui/AiProviderSettings";
import InterfaceThemePicker, { type InterfaceTheme } from "@/components/ui/InterfaceThemePicker";
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
  normalizeVideoCaptions,
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
type ProjectSaveStatus = "loading" | "empty" | "saving" | "saved" | "error" | "dirty";
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
  const [editorTab, setEditorTab] = useState<"audio" | "branding" | "visuals" | "captions">("audio");
  const directorRunRef = useRef(0);
  const [useDirectorTranscription, setUseDirectorTranscription] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
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
  const savedSnapshotKeyRef = useRef<string | null>(null);
  const currentSnapshotKeyRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
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
    segments: audioTranscriptionSegments,
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

  // Render inputs must remain stable during playback. Current time belongs to
  // Remotion's Player, not the manifest handed back to that Player each frame.
  const renderProject = useMemo<VideoProject>(() => {
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
        currentTime: 0,
        duration,
        isPlaying: false,
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
    duration,
    effectPreset,
    generatedBackgroundUrl,
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
    return buildVideoExportManifest(renderProject);
  }, [renderProject]);

  const exportBlockingReasons = useMemo(() => {
    return getVideoExportBlockingReasons(exportManifest);
  }, [exportManifest]);

  const preparedAssets = usePreparedVideoAssets(renderProject);
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
  const snapshotKey = useMemo(() => getProjectSnapshotKey(persistenceSnapshot), [persistenceSnapshot]);
  const saveCurrentProject = useCallback(() => {
    if (!hasLoadedSavedProject.current || savedSnapshotKeyRef.current === snapshotKey) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setProjectSaveStatus("saving");
    setProjectSaveError(null);
    // Keep manual saves and autosaves in order; a slow write must not replace newer edits.
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(async () => {
      if (savedSnapshotKeyRef.current === snapshotKey) return;
      if (hasProjectContent) await saveCreatorProject(persistenceSnapshot);
      else await clearSavedCreatorProject();
      savedSnapshotKeyRef.current = snapshotKey;
      setProjectSaveStatus(currentSnapshotKeyRef.current !== snapshotKey
        ? "dirty" : hasProjectContent ? "saved" : "empty");
      setProjectSaveError(null);
    }).catch((error: unknown) => {
      setProjectSaveStatus("error");
      setProjectSaveError(error instanceof Error ? error.message : "Unable to save the project locally.");
    });
  }, [hasProjectContent, persistenceSnapshot, snapshotKey]);

  const projectSaveLabel = useMemo(() => {
    if (projectSaveStatus === "loading") return "Loading saved project";
    if (projectSaveStatus === "saving") return "Saving project";
    if (projectSaveStatus === "dirty") return "Unsaved changes";
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
      const runId = ++directorRunRef.current;

      setAutoSetupStatus("running");
      setAutoSetupSummary(
        "Auto Director is reading the track and choosing a starting setup."
      );

      let lyricsText = videoCaptions.lyricsText || audioTranscriptionText;
      let captionCues = videoCaptions.lyricsText
        ? videoCaptions.cues
        : audioTranscriptionSegments;
      let usedLocalFallback = false;

      // Lyrics make captions smarter, but Auto Director can still work from
      // local audio analysis when OpenAI transcription is unavailable.
      if (!lyricsText.trim() && useDirectorTranscription) {
        const transcription = await retryAudioTranscription();
        if (transcription) {
          lyricsText = transcription.text;
          captionCues = transcription.segments;
        } else {
          usedLocalFallback = true;
        }
      }

      if (runId !== directorRunRef.current) return;

      const setup = buildAutoCreatorSetup({
        fileName: audioFile.name,
        audioAnalysis,
        lyricsText,
      });

      pause();
      setSongTitle((currentTitle) => currentTitle.trim() ? currentTitle : setup.trackInfo.songTitle);
      setArtistName((currentArtist) => currentArtist.trim() ? currentArtist : setup.trackInfo.artistName);
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
      setVideoCaptions({
        ...setup.style.captions,
        cues: setup.style.captions.mode === "lyrics" ? captionCues : [],
      });
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
      audioTranscriptionSegments,
      pause,
      resetBackgroundGeneration,
      retryAudioTranscription,
      videoCaptions.lyricsText,
      videoCaptions.cues,
      useDirectorTranscription,
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
          setVideoCaptions(normalizeVideoCaptions(savedProject.style.captions));
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
      if (!hasLoadedSavedProject.current) hasStartedProjectRestore.current = false;
    };
  }, [pause, restoreGeneratedBackground]);

  const projectRestoreFinished = projectSaveStatus !== "loading";
  useEffect(() => {
    currentSnapshotKeyRef.current = snapshotKey;
    if (!hasLoadedSavedProject.current) return;
    if (savedSnapshotKeyRef.current === null) {
      savedSnapshotKeyRef.current = snapshotKey;
      return;
    }
    if (savedSnapshotKeyRef.current === snapshotKey) {
      const statusTimer = setTimeout(() => setProjectSaveStatus(hasProjectContent ? "saved" : "empty"), 0);
      return () => clearTimeout(statusTimer);
    }
    const dirtyTimer = setTimeout(() => setProjectSaveStatus("dirty"), 0);
    if (autoSaveEnabled) saveTimerRef.current = setTimeout(saveCurrentProject, 1000);

    return () => {
      clearTimeout(dirtyTimer);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [autoSaveEnabled, saveCurrentProject, snapshotKey, projectRestoreFinished, hasProjectContent]);

  const handleAudioFileChange = useCallback(
    (nextAudioFile: File | null) => {
      directorRunRef.current += 1;
      pause();
      setAudioFile(nextAudioFile);
      setCustomReactiveZones([]);
      setReactiveTimelineMode("auto");
      setVideoCaptions((currentCaptions) => ({
        ...currentCaptions, mode: "off", cues: [], lyricsText: "",
      }));
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
    directorRunRef.current += 1;
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
    <main data-ui-theme={interfaceTheme} className="app-shell min-h-screen px-4 py-4 text-gray-950 sm:px-6">
      <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-4">
        <header className="app-header creator-toolbar flex flex-wrap items-center justify-between gap-4 rounded-lg px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="brand-symbol"><Music aria-hidden="true" className="h-5 w-5" /></span>
            <h1 className="text-base font-semibold text-gray-950">
              AI Music Video Generator
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InterfaceThemePicker
              value={interfaceTheme}
              onChange={setInterfaceTheme}
            />
            <StatusPill
              label={projectSaveLabel}
              tone={projectSaveTone}
              className={projectSaveStatus === "loading" ? "project-loading-status toolbar-save-status" : "toolbar-save-status"}
            />
            <button type="button" onClick={saveCurrentProject}
              disabled={projectSaveStatus === "loading" || projectSaveStatus === "saving"}
              className="toolbar-save inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50">
              <Save aria-hidden="true" className="h-4 w-4" />Save
            </button>
            <details className="workspace-settings" onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }} onBlur={(event) => {
              if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }}>
              <summary title="Workspace settings" aria-label="Workspace settings" className="settings-trigger list-none">
                <Settings2 aria-hidden="true" className="h-4 w-4" />
              </summary>
              <div className="workspace-settings-menu">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-500">Workspace</p>
            <label className="flex items-center justify-between gap-4 py-2 text-sm text-gray-700">
              Autosave
              <input type="checkbox" checked={autoSaveEnabled} onChange={(event) => setAutoSaveEnabled(event.target.checked)} />
            </label>
            <button
              type="button"
              aria-pressed={isDevMode}
              onClick={() => setIsDevMode((currentValue) => !currentValue)}
              className={[
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                isDevMode
                  ? "border-cyan-700 bg-cyan-700 text-white"
                  : "border-gray-200 text-gray-700 hover:border-cyan-300 hover:text-cyan-800",
              ].join(" ")}
            >
              <Code2 aria-hidden="true" className="h-4 w-4" />
              Dev Mode
            </button>
            <button
              type="button"
              disabled={!hasProjectContent}
              onClick={resetProject}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-cyan-300 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </button>
              </div>
            </details>
          </div>
        </header>

        <div
          ref={creatorGridRef}
          className="creator-grid grid w-full min-w-0 max-w-full gap-4 lg:h-[calc(100dvh-7rem)] lg:min-h-[540px] lg:gap-0 lg:overflow-hidden"
          style={{ "--editor-width": `${editorWidth}px` } as CSSProperties}
        >
          <section className="workspace-column editor-column min-w-0 flex flex-col lg:h-full lg:min-h-0 lg:pr-3">
            <div className="editor-tab-bar" role="tablist" aria-label="Video editor">
              {([
                { id: "audio", label: "Audio", icon: Music },
                { id: "branding", label: "Background & Branding", icon: FileText },
                { id: "visuals", label: "Visuals", icon: Palette },
                { id: "captions", label: "Captions", icon: Captions },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={id === "visuals" || id === "captions" ? "editor-design" : `editor-${id}`}
                  aria-selected={editorTab === id} tabIndex={editorTab === id ? 0 : -1}
                  onClick={() => setEditorTab(id)}
                  onKeyDown={(event) => {
                    const tabs = ["audio", "branding", "visuals", "captions"] as const;
                    const next = event.key === "ArrowRight" ? (tabs.indexOf(id) + 1) % 4
                      : event.key === "ArrowLeft" ? (tabs.indexOf(id) + 3) % 4
                      : event.key === "Home" ? 0 : event.key === "End" ? 3 : null;
                    if (next === null) return;
                    event.preventDefault(); setEditorTab(tabs[next]);
                    document.getElementById(`tab-${tabs[next]}`)?.focus();
                  }}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{label}</span>
                </button>
              ))}
            </div>
            <div className="editor-scroll min-w-0 flex-1 overflow-x-hidden lg:min-h-0 lg:overflow-y-auto">

            {projectSaveError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {projectSaveError}
              </p>
            )}

            <AiProviderSettings
              connection={aiConnection}
              onChange={setAiConnection}
            />

            <div role="tabpanel" id="editor-audio" aria-labelledby="tab-audio" hidden={editorTab !== "audio"}>
            <WorkflowStepCard
              flat
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-cyan-950">
                        Auto Director
                      </p>
                      <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                        Alpha
                      </span>
                    </div>
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
                <label className="mt-3 flex items-center gap-2 text-sm text-cyan-900">
                  <input type="checkbox" checked={useDirectorTranscription} onChange={(event) => setUseDirectorTranscription(event.target.checked)} />
                  Transcribe lyrics with connected provider
                </label>
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
            </div>

            <div role="tabpanel" id="editor-branding" aria-labelledby="tab-branding" hidden={editorTab !== "branding"}>
            <WorkflowStepCard
              flat
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
                layout={videoLayout}
                setLayout={setVideoLayout}
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
            </div>

            <div role="tabpanel" id="editor-design"
              aria-labelledby={`tab-${editorTab === "captions" ? "captions" : "visuals"}`}
              hidden={editorTab !== "visuals" && editorTab !== "captions"}>
            <WorkflowStepCard
              flat
              stepNumber={3}
              title={editorTab === "captions" ? "Captions" : "Visual Design"}
              description={editorTab === "captions" ? "Create lyrics and fine-tune their timing." : "Choose the look, layers, and movement for your video."}
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
                view={editorTab === "captions" ? "captions" : "visuals"}
                onTranscribeLyrics={async () => {
                  const transcription = await retryAudioTranscription();
                  if (!transcription) return;
                  setVideoCaptions((captions) => normalizeVideoCaptions({
                    ...captions, mode: "lyrics", lyricsText: transcription.text,
                    cues: transcription.segments,
                  }));
                }}
                isTranscribingLyrics={audioTranscriptionStatus === "transcribing"}
                canTranscribeLyrics={audioFile !== null}
                transcriptionError={audioTranscriptionError}
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
            </div>
            </div>
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

          <section className="workspace-column preview-column min-w-0 flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pl-3 lg:pr-1">
            <RemotionPreviewPanel
              manifest={exportManifest}
              preparedAssets={preparedAssets}
              blockingReasons={exportBlockingReasons}
              playerRef={playerRef}
            >

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
              compact
            />
            </RemotionPreviewPanel>

            <VideoRenderActions
              manifest={exportManifest}
              preparedAssets={preparedAssets}
              assetFiles={renderProject.assets}
              blockingReasons={exportBlockingReasons}
              currentTime={currentTime}
            />

          </section>
        </div>

        {isDevMode && (
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
        )}
      </div>
    </main>
  );
}
