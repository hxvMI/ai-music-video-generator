import { readAppAiCredits } from "@/lib/appAiCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await readAppAiCredits(), {
    headers: { "Cache-Control": "no-store" },
  });
}
