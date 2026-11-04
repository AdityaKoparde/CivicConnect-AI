/** i18n dictionary integrity: every UI string must exist in all three
 *  supported languages (English, Kannada, Hindi) and be non-empty. */
import { describe, expect, it } from 'vitest';
import { STRINGS } from './i18n';

const LANGS = ['en', 'kn', 'hi'] as const;

describe('i18n dictionary', () => {
  it('has at least one string', () => {
    expect(Object.keys(STRINGS).length).toBeGreaterThan(0);
  });

  it('defines every key in en, kn and hi with non-empty values', () => {
    const missing: string[] = [];
    for (const [key, translations] of Object.entries(STRINGS)) {
      for (const lang of LANGS) {
        const value = translations[lang];
        if (typeof value !== 'string' || value.trim() === '') {
          missing.push(`${key}.${lang}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('uses namespaced keys (contains a dot)', () => {
    const flat = Object.keys(STRINGS).filter((k) => !k.includes('.'));
    expect(flat).toEqual([]);
  });
});
