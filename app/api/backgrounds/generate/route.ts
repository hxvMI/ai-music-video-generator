import { randomUUID } from "node:crypto";

import {
  buildOpenAiBackgroundPrompt,
  isBackgroundPresetId,
} from "@/lib/backgroundStudio";
import type {
  BackgroundGenerationErrorResponse,
  BackgroundGenerationRequest,
  BackgroundGenerationResponse,
  BackgroundPromptFields,
} from "@/types/videoProject";
import { getCloudflareModelUrl, resolveServerAiProvider } from "@/lib/serverAiProvider";
import { markAppProviderExhausted, reserveAppAiCredit } from "@/lib/appAiCredits";

export const runtime = "nodejs";
export const maxDuration = 300;

const OPENAI_IMAGE_MODEL = "gpt-image-1.5";
const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const MAX_PROMPT_FIELD_LENGTH = 500;

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};
type CloudflareImageResponse = {
  result?: { image?: string };
  errors?: Array<{ message?: string; code?: number }>;
};

function getProviderErrorMessage(
  status: number,
  error: OpenAiImageResponse["error"]
) {
  if (status === 401) {
    return "OpenAI rejected the API key. Create a new project key and restart the development server.";
  }

  if (
    status === 403 ||
    error?.code === "organization_verification_required"
  ) {
    return "This OpenAI project cannot generate images yet. Check API organization verification and project permissions in the OpenAI dashboard.";
  }

  if (
    error?.code === "insufficient_quota" ||
    error?.code === "billing_hard_limit_reached"
  ) {
    return "The OpenAI project has no available API quota. Check billing and project usage limits.";
  }

  if (error?.code === "moderation_blocked") {
    return "OpenAI blocked this image request. Adjust the mood, scene, or Avoid fields and try again.";
  }

  if (status === 429) {
    return "The OpenAI project is rate-limited or has reached an account limit. Check usage limits and try again shortly.";
  }

  if (status === 400 && error?.message) {
    return `OpenAI rejected the image settings: ${error.message}`;
  }

  return "OpenAI could not generate this background. Check project access, billing, and image-generation permissions.";
}

function errorResponse(
  error: string,
  code: BackgroundGenerationErrorResponse["code"],
  status: number
) {
  return Response.json(
    {
      error,
      code,
    } satisfies BackgroundGenerationErrorResponse,
    { status }
  );
}

function validatePromptFields(
  value: unknown
): BackgroundPromptFields | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<BackgroundPromptFields>;
  const fields: Array<keyof BackgroundPromptFields> = [
    "mood",
    "scene",
    "colorDirection",
    "avoid",
  ];

  for (const field of fields) {
    if (
      typeof candidate[field] !== "string" ||
      candidate[field].length > MAX_PROMPT_FIELD_LENGTH
    ) {
      return null;
    }
  }

  if (
    !candidate.mood?.trim() ||
    !candidate.scene?.trim() ||
    !candidate.colorDirection?.trim()
  ) {
    return null;
  }

  return {
    mood: candidate.mood.trim(),
    scene: candidate.scene.trim(),
    colorDirection: candidate.colorDirection.trim(),
    avoid: candidate.avoid?.trim() ?? "",
  };
}

function parseRequest(value: unknown): BackgroundGenerationRequest | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<BackgroundGenerationRequest>;
  const prompt = validatePromptFields(candidate.prompt);

  if (!isBackgroundPresetId(candidate.presetId) || !prompt) return null;

  return {
    presetId: candidate.presetId,
    prompt,
  };
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return errorResponse(
      "Send valid JSON background settings.",
      "invalid_request",
      400
    );
  }

  const generationRequest = parseRequest(requestBody);

  if (!generationRequest) {
    return errorResponse(
      "Mood, scene, and color direction are required and each field must be 500 characters or fewer.",
      "invalid_request",
      400
    );
  }

  const provider = resolveServerAiProvider(request);

  if (!provider) {
    return errorResponse(
      "Connect OpenAI or Cloudflare Workers AI, or configure a server API key.",
      "missing_api_key",
      503
    );
  }

  let providerResponse: Response;
  const creditError = await reserveAppAiCredit(request);
  if (creditError) return creditError;

  try {
    const prompt = buildOpenAiBackgroundPrompt(generationRequest);
    if (provider.provider === "openai") {
      providerResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt,
          size: "1536x1024",
          quality: "medium",
          output_format: "jpeg",
          background: "opaque",
          n: 1,
        }),
        signal: request.signal,
      });
    } else {
      providerResponse = await fetch(
        getCloudflareModelUrl(provider.accountId, CLOUDFLARE_IMAGE_MODEL),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, steps: 8 }),
          signal: request.signal,
        }
      );
    }
  } catch (reason) {
    console.error("OpenAI image request failed before receiving a response.", reason);
    return errorResponse(
      "The image provider could not be reached. Try again.",
      "provider_error",
      502
    );
  }

  let providerBody: OpenAiImageResponse | CloudflareImageResponse;

  try {
    providerBody = (await providerResponse.json()) as typeof providerBody;
  } catch {
    return errorResponse(
      "The image provider returned an unreadable response.",
      "invalid_provider_response",
      502
    );
  }

  if (!providerResponse.ok) {
    if (provider.provider === "cloudflare" && (providerBody as CloudflareImageResponse).errors?.some((error) => error.code === 3036)) {
      await markAppProviderExhausted(request);
    }
    console.error("OpenAI image generation failed.", {
      status: providerResponse.status,
      provider: provider.provider,
      requestId: providerResponse.headers.get("x-request-id"),
    });
    return errorResponse(
      provider.provider === "openai"
        ? getProviderErrorMessage(providerResponse.status, (providerBody as OpenAiImageResponse).error)
        : (providerBody as CloudflareImageResponse).errors?.[0]?.message ??
          "Cloudflare Workers AI could not generate this background. Check the Account ID and token permissions.",
      "provider_error",
      providerResponse.status === 429 ? 429 : 502
    );
  }

  const base64Image = provider.provider === "openai"
    ? (providerBody as OpenAiImageResponse).data?.[0]?.b64_json
    : (providerBody as CloudflareImageResponse).result?.image;

  if (!base64Image) {
    return errorResponse(
      "The image provider completed without returning an image.",
      "invalid_provider_response",
      502
    );
  }

  return Response.json({
    dataUrl: `data:image/jpeg;base64,${base64Image}`,
    mimeType: "image/jpeg",
    provider: provider.provider,
    model: provider.provider === "openai" ? OPENAI_IMAGE_MODEL : CLOUDFLARE_IMAGE_MODEL,
    generationId: randomUUID(),
  } satisfies BackgroundGenerationResponse);
}
