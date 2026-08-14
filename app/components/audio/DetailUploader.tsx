/* PURPOSE:
Handle song details and background image upload
- Song Title input
- Artist Name input  
- Background Image upload
*/

"use client";

import { LoaderCircle, RefreshCw, Sparkles } from "lucide-react";

import CollapsibleCard from "@/components/ui/CollapsibleCard";
import FileDropzone from "@/components/ui/FileDropzone";
import {
  BACKGROUND_PRESETS,
  getBackgroundPreset,
} from "@/lib/backgroundStudio";
import type {
  BackgroundGenerationProvider,
  BackgroundPresetId,
  BackgroundPromptFields,
  BackgroundSource,
} from "@/types/videoProject";

// Was added for lifting up the State to accept props instead
// React.Dispatch<React.SetStateAction<string>>
// is a React setter function
// example setSongTitle, setArtistName, etc.

type DetailUploaderProps = {
  songTitle: string;
  setSongTitle: React.Dispatch<React.SetStateAction<string>>;

  artistName: string;
  setArtistName: React.Dispatch<React.SetStateAction<string>>;

  logoImage: File | null;
  setLogoImage: React.Dispatch<React.SetStateAction<File | null>>;

  backgroundImage: File | null;
  setBackgroundImage: React.Dispatch<React.SetStateAction<File | null>>;
  backgroundSource: BackgroundSource;
  setBackgroundSource: React.Dispatch<React.SetStateAction<BackgroundSource>>;
  backgroundPresetId: BackgroundPresetId;
  setBackgroundPresetId: React.Dispatch<
    React.SetStateAction<BackgroundPresetId>
  >;
  backgroundPrompt: BackgroundPromptFields;
  setBackgroundPrompt: React.Dispatch<
    React.SetStateAction<BackgroundPromptFields>
  >;
  generatedBackgroundUrl: string;
  generationProvider: BackgroundGenerationProvider;
  hasAiBackground: boolean;
  isGeneratingBackground: boolean;
  isGenerationStale: boolean;
  generationError: string | null;
  onGenerateBackground: () => Promise<void>;
  onUseLocalTemplate: () => void;
  showTitle?: boolean;
  surface?: "card" | "plain";
};

// NOTE:
// REACT HOOKs like useState can only be called from a react component function
// which are denoted by either
// NameStartingWithCapsLikeThis
// or by changing the name of a function to start with "use"
// useDetailUploader
// This was empty before but since Lifting up the state we added parameters from the Type
// Filled with object destructuring which is equivalent to something like const songTitle = props.songTitle;
export default function DetailUploader({
  songTitle,
  setSongTitle,
  artistName,
  setArtistName,
  logoImage,
  setLogoImage,
  backgroundImage,
  setBackgroundImage,
  backgroundSource,
  setBackgroundSource,
  backgroundPresetId,
  setBackgroundPresetId,
  backgroundPrompt,
  setBackgroundPrompt,
  generatedBackgroundUrl,
  generationProvider,
  hasAiBackground,
  isGeneratingBackground,
  isGenerationStale,
  generationError,
  onGenerateBackground,
  onUseLocalTemplate,
  showTitle = true,
  surface = "card",
}: DetailUploaderProps) {
  // using useState();
  // extracting songName, artistName, backgroundImage
  /** We are moving lifting the state of these up to page so commenting them out */
  // const [songTitle, setSongTitle] = useState("");
  // const [artistName, setArtistName] = useState("");
  // const [backgroundImage, setBackgroundImage] = useState<File | null> (null);

  const containerClass =
    surface === "card" ? "rounded-lg border bg-white p-4" : "";
  const selectedBackgroundPreset = getBackgroundPreset(backgroundPresetId);
  const effectiveBackgroundLabel =
    backgroundSource === "upload"
      ? backgroundImage
        ? `Uploaded: ${backgroundImage.name}`
        : "Upload selected - image missing"
      : generationProvider !== "local"
        ? `${generationProvider === "openai" ? "OpenAI" : "Cloudflare"}: ${selectedBackgroundPreset.label}`
        : `Generated: ${selectedBackgroundPreset.label}`;
  const updatePromptField = (
    fieldName: keyof BackgroundPromptFields,
    value: string
  ) => {
    setBackgroundPrompt((currentPrompt) => ({
      ...currentPrompt,
      [fieldName]: value,
    }));
  };

  return (
    <div className={containerClass}>
      {showTitle && (
        <h2 className="font-semibold text-gray-950">Track & Branding</h2>
      )}

      <div className={showTitle ? "mt-4 grid gap-3" : "grid gap-3"}>
        <CollapsibleCard
          title="Track Information"
          description="Optional text that can appear in the video and export summary."
          summary={
            songTitle || artistName
              ? `${artistName || "No artist"} - ${songTitle || "No title"}`
              : "No title or artist shown"
          }
          defaultOpen
        >
          <div className="grid gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Song title
              <input
                type="text"
                placeholder="Midnight Drive"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Artist name
              <input
                type="text"
                placeholder="Artist or producer"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
              />
            </label>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Background Studio"
          description="Upload an image or use a generated local background."
          summary={effectiveBackgroundLabel}
          defaultOpen
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border text-sm">
              {(["generated", "upload"] as BackgroundSource[]).map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setBackgroundSource(source)}
                  className={[
                    "px-3 py-2 font-medium capitalize",
                    backgroundSource === source
                      ? "bg-gray-950 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {source}
                </button>
              ))}
            </div>

            {backgroundSource === "upload" ? (
              <FileDropzone
                label="Background image"
                description="Upload cover art, a photo, or a custom background."
                accept={{
                  "image/*": [".png", ".jpg", ".jpeg", ".webp"],
                }}
                selectedFile={backgroundImage}
                onFileChange={(file) => {
                  setBackgroundImage(file);
                  setBackgroundSource(file ? "upload" : "generated");
                }}
              />
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Background style
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {BACKGROUND_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setBackgroundPresetId(preset.id);
                          setBackgroundSource("generated");
                        }}
                        className={[
                          "selectable-card rounded-lg border p-3 text-left transition",
                          backgroundPresetId === preset.id
                            ? "is-selected"
                            : "border-gray-200 bg-white hover:border-cyan-300",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: preset.colors.accent }}
                          />
                          <span className="text-sm font-semibold text-gray-950">
                            {preset.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border bg-black">
                  <div
                    className="aspect-video bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${generatedBackgroundUrl}")`,
                    }}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                    Mood
                    <input
                      type="text"
                      maxLength={500}
                      value={backgroundPrompt.mood}
                      onChange={(event) =>
                        updatePromptField("mood", event.target.value)
                      }
                      className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                    Scene
                    <input
                      type="text"
                      maxLength={500}
                      value={backgroundPrompt.scene}
                      onChange={(event) =>
                        updatePromptField("scene", event.target.value)
                      }
                      className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                    Color direction
                    <input
                      type="text"
                      maxLength={500}
                      value={backgroundPrompt.colorDirection}
                      onChange={(event) =>
                        updatePromptField("colorDirection", event.target.value)
                      }
                      className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                    Avoid
                    <input
                      type="text"
                      maxLength={500}
                      value={backgroundPrompt.avoid}
                      onChange={(event) =>
                        updatePromptField("avoid", event.target.value)
                      }
                      className="rounded-lg border px-3 py-2 font-normal text-gray-950 outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>

                {generationError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {generationError}
                  </p>
                ) : isGenerationStale ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Prompt settings changed. The current AI image remains active
                    until you regenerate it.
                  </p>
                ) : hasAiBackground ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    AI background is active in the preview and export.
                  </p>
                ) : (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    The local template is active. Generate an AI image when the
                    direction is ready.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      isGeneratingBackground ||
                      !backgroundPrompt.mood.trim() ||
                      !backgroundPrompt.scene.trim() ||
                      !backgroundPrompt.colorDirection.trim()
                    }
                    onClick={() => void onGenerateBackground()}
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingBackground ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : generationError || hasAiBackground ? (
                      <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Sparkles aria-hidden="true" className="h-4 w-4" />
                    )}
                    {isGeneratingBackground
                      ? "Generating..."
                      : generationError
                        ? "Retry generation"
                        : hasAiBackground
                          ? "Regenerate"
                          : "Generate background"}
                  </button>

                  {hasAiBackground && (
                    <button
                      type="button"
                      disabled={isGeneratingBackground}
                      onClick={onUseLocalTemplate}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Use local template
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Logo Overlay"
          description="Add an optional brand mark above the video background."
          summary={logoImage?.name ?? "No logo attached"}
          defaultOpen
        >
          <FileDropzone
            label="Logo overlay"
            description="Upload a transparent PNG or brand mark for the video frame."
            accept={{
              "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg"],
            }}
            selectedFile={logoImage}
            onFileChange={setLogoImage}
          />
        </CollapsibleCard>
      </div>
    </div>
  );
}
