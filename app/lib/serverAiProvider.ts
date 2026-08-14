import {
  AI_PROVIDER_HEADER,
  CLOUDFLARE_ACCOUNT_HEADER,
  CLOUDFLARE_TOKEN_HEADER,
  OPENAI_KEY_HEADER,
} from "@/lib/aiProvider";

export type ServerAiProvider =
  | { provider: "openai"; apiKey: string }
  | { provider: "cloudflare"; accountId: string; apiToken: string };

export function resolveServerAiProvider(request: Request): ServerAiProvider | null {
  const selectedProvider = request.headers.get(AI_PROVIDER_HEADER) ?? "server";

  if (selectedProvider === "openai") {
    const apiKey = request.headers.get(OPENAI_KEY_HEADER)?.trim();
    return apiKey ? { provider: "openai", apiKey } : null;
  }

  if (selectedProvider === "cloudflare") {
    const accountId = request.headers.get(CLOUDFLARE_ACCOUNT_HEADER)?.trim();
    const apiToken = request.headers.get(CLOUDFLARE_TOKEN_HEADER)?.trim();
    return accountId && apiToken
      ? { provider: "cloudflare", accountId, apiToken }
      : null;
  }

  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (process.env.AI_PROVIDER === "cloudflare" && cloudflareAccountId && cloudflareApiToken) {
    return {
      provider: "cloudflare",
      accountId: cloudflareAccountId,
      apiToken: cloudflareApiToken,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey ? { provider: "openai", apiKey } : null;
}

export function getCloudflareModelUrl(accountId: string, model: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
}

