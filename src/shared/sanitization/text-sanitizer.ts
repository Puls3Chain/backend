import * as sanitizeHtml from 'sanitize-html';

const FIELD_LIMITS: Record<string, number> = {
  bio: 500,
  displayName: 60,
  message: 280,
};

// Control characters (NUL, backspace, vertical tab, form feed, etc.) must be
// removed from stored text. Their literal presence in the class is intentional.
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitize a freeform text field: strip all HTML, reject control chars,
 * enforce per-field length limits, and normalize to NFC Unicode.
 */
export function sanitizeText(input: string, field: string): string {
  if (!input) return '';

  const stripped = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });

  const cleaned = stripped.normalize('NFC').replace(CONTROL_CHAR_RE, '').trim();

  const limit = FIELD_LIMITS[field] ?? 1000;
  return cleaned.slice(0, limit);
}
