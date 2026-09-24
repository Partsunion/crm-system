import { describe, expect, it } from 'vitest';
import { safeWebsiteUrl } from './safeUrl';
describe('untrusted lead website links', () => {
  it.each(['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com', 'java\nscript:alert(1)'])('rejects %s', (value) => expect(safeWebsiteUrl(value)).toBeUndefined());
  it('allows ordinary sites and adds HTTPS to bare domains', () => { expect(safeWebsiteUrl('example.de/kontakt')).toBe('https://example.de/kontakt'); expect(safeWebsiteUrl('https://example.de')).toBe('https://example.de/'); });
});
