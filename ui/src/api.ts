/**
 * Shared fetch helpers used across all components.
 */

/**
 * Parse an API error response into a human-readable string.
 * FastAPI returns { "detail": "..." } for HTTP errors; falls back to raw text.
 */
export async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (typeof json.detail === "string") return json.detail;
    if (Array.isArray(json.detail)) {
      // Pydantic validation errors: [{loc, msg, type}, ...]
      return json.detail.map((e: { msg: string }) => e.msg).join("; ");
    }
  } catch {
    // not JSON
  }
  return text || `HTTP ${res.status}`;
}
