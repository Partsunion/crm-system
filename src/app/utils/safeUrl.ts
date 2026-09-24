/** Untrusted lead/scraper data may contain executable URL schemes. */
export function safeWebsiteUrl(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw || [...raw].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return undefined;
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return undefined;
    return parsed.href;
  } catch { return undefined; }
}
