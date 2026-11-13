import type { AppAiCredits } from "@/types/aiCredits";
import { AI_PROVIDER_HEADER } from "@/lib/aiProvider";
import { resolveServerAiProvider } from "@/lib/serverAiProvider";

export const CREDIT_RESERVATION_SQL = `
  INSERT INTO app_ai_daily_usage (day, used, provider_exhausted) VALUES (?, 1, 0)
  ON CONFLICT(day) DO UPDATE SET used = used + 1
  WHERE used < ? AND provider_exhausted = 0
  RETURNING used, provider_exhausted`;

export function getCreditWindow(now = new Date()) {
  const resetsAt = new Date(now);
  resetsAt.setUTCHours(24, 0, 0, 0);
  return { day: now.toISOString().slice(0, 10), resetsAt: resetsAt.toISOString() };
}

export function getDailyCreditLimit() {
  const limit = Number(process.env.APP_AI_DAILY_CREDITS ?? 100);
  return Number.isSafeInteger(limit) && limit > 0 ? limit : 100;
}

export function hasAppCreditConfiguration() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
    process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() &&
    process.env.CLOUDFLARE_D1_API_TOKEN?.trim());
}

type UsageRow = { used: number; provider_exhausted: number };

async function queryUsage(sql: string, params: (string | number)[]): Promise<UsageRow[]> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
  const database = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() ?? "";
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/d1/database/${encodeURIComponent(database)}/query`,
    {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_D1_API_TOKEN?.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(10000),
    }
  );
  const body = await response.json() as {
    success?: boolean;
    result?: Array<{ success?: boolean; results?: UsageRow[] }>;
  };
  if (!response.ok || body.success !== true || body.result?.[0]?.success !== true) {
    throw new Error("Shared AI credits are unavailable. Use a personal connection or try again later.");
  }
  return body.result[0].results ?? [];
}

export async function readAppAiCredits(): Promise<AppAiCredits> {
  const { day, resetsAt } = getCreditWindow();
  const limit = getDailyCreditLimit();
  const base = { limit, resetsAt, provider: "cloudflare" as const };
  if (!hasAppCreditConfiguration()) {
    return { ...base, status: "not_configured", used: null, remaining: null };
  }
  try {
    const rows = await queryUsage("SELECT used, provider_exhausted FROM app_ai_daily_usage WHERE day = ?", [day]);
    const used = rows[0]?.used ?? 0;
    // This is our request budget, not a measurement of Cloudflare's remaining neurons.
    const remaining = rows[0]?.provider_exhausted ? 0 : Math.max(0, limit - used);
    return { ...base, used, remaining, status: remaining > 0 ? "ready" : "exhausted" };
  } catch {
    return { ...base, status: "unavailable", used: null, remaining: null };
  }
}

// The conditional UPSERT is one atomic database statement. Concurrent Vercel
// instances therefore cannot each spend the final shared credit.
export async function reserveAppAiCredit(request: Request): Promise<Response | null> {
  if ((request.headers.get(AI_PROVIDER_HEADER) ?? "server") !== "server") return null;
  if (!resolveServerAiProvider(request) || !hasAppCreditConfiguration()) {
    return Response.json({ error: "App default is not configured yet. Choose a personal OpenAI or Cloudflare connection.", code: "missing_api_key" }, { status: 503 });
  }
  try {
    const rows = await queryUsage(CREDIT_RESERVATION_SQL, [getCreditWindow().day, getDailyCreditLimit()]);
    if (rows.length) return null;
    return Response.json({ error: "The shared daily AI allowance is exhausted. Switch to your own configuration or wait until 00:00 UTC.", code: "quota_exhausted" }, { status: 429 });
  } catch {
    return Response.json({ error: "Shared AI credits could not be checked. Use a personal connection or try again later.", code: "quota_unavailable" }, { status: 503 });
  }
}

export async function markAppProviderExhausted(request: Request) {
  if ((request.headers.get(AI_PROVIDER_HEADER) ?? "server") !== "server") return;
  try {
    await queryUsage("UPDATE app_ai_daily_usage SET provider_exhausted = 1 WHERE day = ? RETURNING used, provider_exhausted", [getCreditWindow().day]);
  } catch {
    console.error("Unable to mark shared AI quota exhausted.");
  }
}
