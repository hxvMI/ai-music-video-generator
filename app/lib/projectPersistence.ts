import type {
  BackgroundPresetId,
  BackgroundPromptFields,
  BackgroundSource,
  CameraPreset,
  EffectPreset,
  ReactiveTimelineMode,
  ReactiveZone,
  VideoCaptionConfig,
  VideoLayoutConfig,
  VideoBackgroundConfig,
  VideoTheme,
  VisualMode,
  VisualizerPreset,
} from "@/types/videoProject";

const DATABASE_NAME = "ai-music-video-generator";
const DATABASE_VERSION = 1;
const PROJECT_STORE_NAME = "creator-projects";
const ACTIVE_PROJECT_ID = "active-project";

export type PersistedCreatorProject = {
  id: typeof ACTIVE_PROJECT_ID;
  version: 1;
  savedAtIso: string;
  metadata: {
    songTitle: string;
    artistName: string;
  };
  assets: {
    audioFile: File | null;
    backgroundImage: File | null;
    logoImage: File | null;
  };
  background: {
    source: BackgroundSource;
    presetId: BackgroundPresetId;
    prompt: BackgroundPromptFields;
    generatedDataUrl: string;
    generation: VideoBackgroundConfig["generation"];
  };
  style: {
    theme: VideoTheme;
    visualizerColor: string;
    visualMode: VisualMode;
    visualizerPreset: VisualizerPreset;
    cameraPreset: CameraPreset;
    effectPreset: EffectPreset;
    randomSeed: number;
    reactiveTimelineMode: ReactiveTimelineMode;
    customReactiveZones: ReactiveZone[];
    layout?: VideoLayoutConfig;
    captions?: VideoCaptionConfig;
  };
};

export type PersistedCreatorProjectInput = Omit<
  PersistedCreatorProject,
  "id" | "version" | "savedAtIso"
>;

function getIndexedDb() {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("Local project storage is not available in this browser.");
  }

  return window.indexedDB;
}

function openProjectDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = getIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        database.createObjectStore(PROJECT_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open project storage."));
  });
}

function runProjectStoreRequest<T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>
) {
  return openProjectDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(PROJECT_STORE_NAME, mode);
        const store = transaction.objectStore(PROJECT_STORE_NAME);
        const request = createRequest(store);

        request.onerror = () =>
          reject(request.error ?? new Error("Project storage request failed."));
        transaction.oncomplete = () => {
          database.close();
          resolve(request.result);
        };
        transaction.onerror = () => {
          database.close();
          reject(
            transaction.error ?? new Error("Project storage transaction failed.")
          );
        };
        transaction.onabort = () => {
          database.close();
          reject(
            transaction.error ?? new Error("Project storage transaction aborted.")
          );
        };
      })
  );
}

export function loadSavedCreatorProject() {
  return runProjectStoreRequest<PersistedCreatorProject | undefined>(
    "readonly",
    (store) => store.get(ACTIVE_PROJECT_ID)
  ).then((project) => project ?? null);
}

export function saveCreatorProject(project: PersistedCreatorProjectInput) {
  const nextProject: PersistedCreatorProject = {
    ...project,
    id: ACTIVE_PROJECT_ID,
    version: 1,
    savedAtIso: new Date().toISOString(),
  };

  return runProjectStoreRequest<IDBValidKey>("readwrite", (store) =>
    store.put(nextProject)
  ).then(() => undefined);
}

export function clearSavedCreatorProject() {
  return runProjectStoreRequest<undefined>("readwrite", (store) =>
    store.delete(ACTIVE_PROJECT_ID)
  ).then(() => undefined);
}
