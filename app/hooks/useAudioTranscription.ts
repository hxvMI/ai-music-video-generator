"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { buildAiProviderHeaders } from "@/lib/aiProvider";

import type {
  AiProviderConnection,
  AudioTranscriptionErrorResponse,
  AudioTranscriptionResponse,
} from "@/types/videoProject";

type TranscriptionStatus =
  | "idle"
  | "transcribing"
  | "succeeded"
  | "failed"
  | "unavailable";

type UseAudioTranscriptionOptions = {
  enabled?: boolean;
  connection: AiProviderConnection;
};

export function useAudioTranscription(
  audioFile: File | null,
  { enabled = true, connection }: UseAudioTranscriptionOptions
) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const transcribe = useCallback(async (): Promise<string | null> => {
    abortControllerRef.current?.abort();

    if (!audioFile) {
      setText("");
      setStatus("idle");
      setError(null);
      return null;
    }

    const controller = new AbortController();
    const formData = new FormData();
    formData.append("audio", audioFile);
    abortControllerRef.current = controller;
    setStatus("transcribing");
    setError(null);

    try {
      const response = await fetch("/api/audio/transcribe", {
        method: "POST",
        headers: buildAiProviderHeaders(connection),
        body: formData,
        signal: controller.signal,
      });
      const responseBody = (await response.json()) as
        | AudioTranscriptionResponse
        | AudioTranscriptionErrorResponse;

      if (!response.ok || "error" in responseBody) {
        throw new Error(
          "error" in responseBody
            ? responseBody.error
            : "Unable to transcribe audio."
        );
      }

      setText(responseBody.text);
      setStatus("succeeded");
      setError(null);
      return responseBody.text;
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        return null;
      }

      setText("");
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to transcribe audio.";
      setStatus(
        message.toLowerCase().includes("not configured")
          ? "unavailable"
          : "failed"
      );
      setError(message);
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [audioFile, connection]);

  useEffect(() => {
    if (!audioFile) {
      const resetTimer = window.setTimeout(() => {
        setText("");
        setStatus("idle");
        setError(null);
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }

    const transcribeTimer = window.setTimeout(() => {
      if (!enabled) {
        setText("");
        setStatus("idle");
        setError(null);
      } else {
        void transcribe();
      }
    }, 0);

    return () => {
      window.clearTimeout(transcribeTimer);
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [audioFile, enabled, transcribe]);

  return {
    text,
    status,
    error,
    retry: transcribe,
    isTranscribing: status === "transcribing",
  };
}
