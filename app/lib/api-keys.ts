/** Read user-provided API keys from localStorage and return custom headers for API calls. */
export function getUserApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const raw = localStorage.getItem('appSettings');
    if (!raw) return headers;
    const s = JSON.parse(raw);
    if (s.mistralApiKey) headers['x-mistral-api-key'] = s.mistralApiKey;
    if (s.elevenlabsApiKey) headers['x-elevenlabs-api-key'] = s.elevenlabsApiKey;
  } catch { /* private browsing */ }
  return headers;
}
