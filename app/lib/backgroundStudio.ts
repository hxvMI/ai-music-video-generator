import type {
  BackgroundGenerationRequest,
  BackgroundPresetId,
  BackgroundPromptFields,
} from "@/types/videoProject";

type BackgroundPreset = {
  id: BackgroundPresetId;
  label: string;
  description: string;
  colors: {
    base: string;
    accent: string;
    highlight: string;
  };
};

export const DEFAULT_BACKGROUND_PRESET_ID: BackgroundPresetId =
  "clean-gradient";

export const DEFAULT_BACKGROUND_PROMPT: BackgroundPromptFields = {
  mood: "polished and atmospheric",
  scene: "abstract music video backdrop",
  colorDirection: "cyan and charcoal",
  avoid: "faces, text, logos",
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "clean-gradient",
    label: "Clean Gradient",
    description: "Polished soft gradient for simple title videos.",
    colors: {
      base: "#101820",
      accent: "#00C2FF",
      highlight: "#F6F7F9",
    },
  },
  {
    id: "neon-stage",
    label: "Neon Stage",
    description: "High contrast glow with stage-light energy.",
    colors: {
      base: "#050816",
      accent: "#7C3AED",
      highlight: "#00E5FF",
    },
  },
  {
    id: "cinematic-dark",
    label: "Cinematic Dark",
    description: "Deep contrast with a controlled dramatic glow.",
    colors: {
      base: "#080808",
      accent: "#C9A227",
      highlight: "#EFF6FF",
    },
  },
  {
    id: "soft-lofi",
    label: "Soft Lofi",
    description: "Muted warm tones with a relaxed vignette.",
    colors: {
      base: "#1F2933",
      accent: "#F59E72",
      highlight: "#B7E4C7",
    },
  },
];

const colorKeywordMap: Record<string, string> = {
  amber: "#F59E0B",
  blue: "#3B82F6",
  cyan: "#06B6D4",
  gold: "#D4AF37",
  green: "#22C55E",
  orange: "#F97316",
  pink: "#EC4899",
  purple: "#8B5CF6",
  red: "#EF4444",
  teal: "#14B8A6",
  white: "#F8FAFC",
  yellow: "#EAB308",
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAccentColor(colorDirection: string, fallback: string) {
  const hexMatch = colorDirection.match(/#[0-9a-f]{3,8}\b/i);

  if (hexMatch) return hexMatch[0];

  const lowerValue = colorDirection.toLowerCase();
  const matchedKeyword = Object.keys(colorKeywordMap).find((keyword) =>
    lowerValue.includes(keyword)
  );

  return matchedKeyword ? colorKeywordMap[matchedKeyword] : fallback;
}

export function getBackgroundPreset(presetId: BackgroundPresetId) {
  return (
    BACKGROUND_PRESETS.find((preset) => preset.id === presetId) ??
    BACKGROUND_PRESETS[0]
  );
}

export function isBackgroundPresetId(
  value: unknown
): value is BackgroundPresetId {
  return BACKGROUND_PRESETS.some((preset) => preset.id === value);
}

export function getBackgroundRequestFingerprint({
  presetId,
  prompt,
}: BackgroundGenerationRequest) {
  return JSON.stringify({
    presetId,
    mood: prompt.mood.trim(),
    scene: prompt.scene.trim(),
    colorDirection: prompt.colorDirection.trim(),
    avoid: prompt.avoid.trim(),
  });
}

export function buildOpenAiBackgroundPrompt({
  presetId,
  prompt,
}: BackgroundGenerationRequest) {
  const preset = getBackgroundPreset(presetId);
  const avoid = prompt.avoid.trim() || "text, logos, watermarks, faces";

  return [
    "Create a polished landscape background for a YouTube music visualizer.",
    `Visual direction: ${preset.label}. ${preset.description}`,
    `Mood: ${prompt.mood.trim()}.`,
    `Scene: ${prompt.scene.trim()}.`,
    `Color direction: ${prompt.colorDirection.trim()}.`,
    `Avoid: ${avoid}.`,
    "Composition requirements: background image only; no words, letters, typography, logos, signatures, or watermarks. Use a wide cinematic composition with important visual detail kept near the center so a 16:9 center crop remains balanced. Leave clear negative space for title, artist, logo, and audio visualizer overlays.",
  ].join("\n");
}

export function buildGeneratedBackgroundDataUrl({
  presetId,
  prompt,
}: {
  presetId: BackgroundPresetId;
  prompt: BackgroundPromptFields;
}) {
  const preset = getBackgroundPreset(presetId);
  const accent = getAccentColor(prompt.colorDirection, preset.colors.accent);
  const mood = escapeXml(prompt.mood || preset.label);
  const scene = escapeXml(prompt.scene || preset.description);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="mainGlow" cx="48%" cy="48%" r="72%">
      <stop offset="0%" stop-color="${preset.colors.highlight}" stop-opacity="0.38"/>
      <stop offset="42%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${preset.colors.base}" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${preset.colors.base}"/>
      <stop offset="52%" stop-color="${accent}" stop-opacity="0.52"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
    <filter id="softNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="3" seed="8"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.18"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#wash)"/>
  <rect width="1920" height="1080" fill="url(#mainGlow)"/>
  <circle cx="1560" cy="220" r="360" fill="${accent}" opacity="0.16"/>
  <circle cx="280" cy="820" r="420" fill="${preset.colors.highlight}" opacity="0.12"/>
  <path d="M-80 780 C 360 620, 680 980, 1080 760 S 1660 520, 2060 740" fill="none" stroke="${preset.colors.highlight}" stroke-width="4" opacity="0.22"/>
  <path d="M-120 860 C 420 700, 820 1030, 1220 820 S 1650 660, 2040 780" fill="none" stroke="${accent}" stroke-width="8" opacity="0.16"/>
  <rect width="1920" height="1080" filter="url(#softNoise)" opacity="0.7"/>
  <metadata>${mood} | ${scene}</metadata>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
