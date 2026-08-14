import { randomUUID } from "node:crypto";

import type {
  AudioTranscriptionErrorResponse,
  AudioTranscriptionResponse,
} from "@/types/videoProject";
import { getCloudflareModelUrl, resolveServerAiProvider } from "@/lib/serverAiProvider";

export const runtime = "nodejs";
export const maxDuration = 300;

const OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-transcribe";
const CLOUDFLARE_TRANSCRIPTION_MODEL = "@cf/openai/whisper";
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

type OpenAiTranscriptionResponse = {
  text?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

type CloudflareTranscriptionResponse = {
  result?: { text?: string };
  success?: boolean;
  errors?: Array<{ message?: string }>;
};

function errorResponse(
  error: string,
  code: AudioTranscriptionErrorResponse["code"],
  status: number
) {
  return Response.json(
    {
      error,
      code,
    } satisfies AudioTranscriptionErrorResponse,
    { status }
  );
}

function getProviderErrorMessage(
  status: number,
  error: OpenAiTranscriptionResponse["error"]
) {
  if (status === 401) {
    return "OpenAI rejected the API key. Create a new project key and restart the development server.";
  }

  if (
    error?.code === "insufficient_quota" ||
    error?.code === "billing_hard_limit_reached"
  ) {
    return "The OpenAI project has no available API quota. Check billing and project usage limits.";
  }

  if (status === 429) {
    return "The OpenAI project is rate-limited or has reached an account limit. Try again shortly.";
  }

  if (status === 400 && error?.message) {
    return `OpenAI rejected the audio transcription request: ${error.message}`;
  }

  return "OpenAI could not transcribe this audio. Check project access, billing, and transcription permissions.";
}

function isAudioFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.type.startsWith("audio/");
}

export async function POST(request: Request) {
  let requestFormData: FormData;

  try {
    requestFormData = await request.formData();
  } catch {
    return errorResponse("Send a multipart audio upload.", "invalid_request", 400);
  }

  const audioFile = requestFormData.get("audio");

  if (!isAudioFile(audioFile)) {
    return errorResponse(
      "Upload an audio file to transcribe.",
      "invalid_request",
      400
    );
  }

  if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
    return errorResponse(
      "Audio transcription supports files up to 25MB in this local workflow.",
      "invalid_request",
      413
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

  try {
    if (provider.provider === "openai") {
      const providerFormData = new FormData();
      providerFormData.append("file", audioFile, audioFile.name);
      providerFormData.append("model", OPENAI_TRANSCRIPTION_MODEL);
      providerFormData.append("response_format", "json");
      providerResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.apiKey}` },
        body: providerFormData,
        signal: request.signal,
      });
    } else {
      providerResponse = await fetch(
        getCloudflareModelUrl(provider.accountId, CLOUDFLARE_TRANSCRIPTION_MODEL),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiToken}`,
            "Content-Type": audioFile.type || "application/octet-stream",
          },
          body: audioFile,
          signal: request.signal,
        }
      );
    }
  } catch (reason) {
    console.error(
      "OpenAI transcription request failed before receiving a response.",
      reason
    );
    return errorResponse(
      "The transcription provider could not be reached. Auto Director will continue without lyrics.",
      "provider_error",
      502
    );
  }

  let providerBody: OpenAiTranscriptionResponse | CloudflareTranscriptionResponse;

  try {
    providerBody = (await providerResponse.json()) as typeof providerBody;
  } catch {
    return errorResponse(
      "The transcription provider returned an unreadable response.",
      "invalid_provider_response",
      502
    );
  }

  if (!providerResponse.ok) {
    console.error("OpenAI transcription failed.", {
      status: providerResponse.status,
      provider: provider.provider,
      requestId: providerResponse.headers.get("x-request-id"),
    });
    return errorResponse(
      provider.provider === "openai"
        ? getProviderErrorMessage(providerResponse.status, (providerBody as OpenAiTranscriptionResponse).error)
        : (providerBody as CloudflareTranscriptionResponse).errors?.[0]?.message ??
          "Cloudflare Workers AI could not transcribe this audio. Check the Account ID, token permissions, and file format.",
      "provider_error",
      providerResponse.status === 429 ? 429 : 502
    );
  }

  const text = (provider.provider === "openai"
    ? (providerBody as OpenAiTranscriptionResponse).text
    : (providerBody as CloudflareTranscriptionResponse).result?.text)?.trim();

  if (!text) {
    return errorResponse(
      "The transcription provider completed without returning text.",
      "invalid_provider_response",
      502
    );
  }

  return Response.json({
    text,
    provider: provider.provider,
    model: provider.provider === "openai" ? OPENAI_TRANSCRIPTION_MODEL : CLOUDFLARE_TRANSCRIPTION_MODEL,
    transcriptId: randomUUID(),
  } satisfies AudioTranscriptionResponse);
}
