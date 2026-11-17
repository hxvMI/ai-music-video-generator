export async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  // Hosting errors can be plain text or HTML, even when our own route always returns JSON.
  const raw = await response.text();
  let body: unknown;
  try { body = JSON.parse(raw); } catch { body = null; }
  if (!response.ok) {
    if (response.status === 413) throw new Error("The hosting service rejected this upload because it is too large. Try a smaller audio file or use the local app.");
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") throw new Error(body.error);
    if (response.status === 504 || response.status === 408) throw new Error("The AI request timed out. Try again or use a shorter audio file.");
    throw new Error(`${fallback} (HTTP ${response.status}). Please try again.`);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(`${fallback} The server returned an unreadable response.`);
  if ("error" in body && typeof body.error === "string") throw new Error(body.error);
  return body as T;
}
