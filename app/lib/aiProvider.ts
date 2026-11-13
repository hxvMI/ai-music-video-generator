import type { AiProviderConnection } from "@/types/videoProject";

export const AI_PROVIDER_HEADER = "x-creator-ai-provider";
export const OPENAI_KEY_HEADER = "x-creator-openai-key";
export const CLOUDFLARE_ACCOUNT_HEADER = "x-creator-cloudflare-account";
export const CLOUDFLARE_TOKEN_HEADER = "x-creator-cloudflare-token";

export function buildAiProviderHeaders(
  connection: AiProviderConnection
): Record<string, string> {
  if (connection.provider === "openai") {
    return {
      [AI_PROVIDER_HEADER]: "openai",
      [OPENAI_KEY_HEADER]: connection.openAiApiKey.trim(),
    };
  }

  if (
    connection.provider === "cloudflare"
  ) {
    return {
      [AI_PROVIDER_HEADER]: "cloudflare",
      [CLOUDFLARE_ACCOUNT_HEADER]: connection.cloudflareAccountId.trim(),
      [CLOUDFLARE_TOKEN_HEADER]: connection.cloudflareApiToken.trim(),
    };
  }

  return { [AI_PROVIDER_HEADER]: "server" };
}
