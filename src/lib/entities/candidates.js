import { normalizeString } from './normalize.js';

export function extractCandidates(text) {
  const raw = text
    .replace(/[\n\r]/g, ' ')
    .split(/[,.;:!?]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates = new Set();

  for (const chunk of raw) {
    if (chunk.length > 3) candidates.add(chunk);

    const words = chunk.split(/\s+/);
    for (const w of words) {
      if (/^[A-Z][a-z]+$/.test(w)) {
        candidates.add(w);
      }
    }
  }

  return [...candidates];
}
