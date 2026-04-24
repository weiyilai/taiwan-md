import { ui, defaultLang, showDefaultLang } from './ui';
import type { Lang } from '../types';

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

// 2026-04-24 β3: Fallback chain — for non-default languages without full
// UI translation (e.g. fr/es), fall back to English first (more useful for
// international readers than zh-TW), then default. en falls back to default
// directly. zh-TW is the default.
const FALLBACK_CHAIN: Record<string, readonly Lang[]> = {
  fr: ['fr', 'en', 'zh-TW'] as Lang[],
  es: ['es', 'en', 'zh-TW'] as Lang[],
  ja: ['ja', 'zh-TW'] as Lang[],
  ko: ['ko', 'zh-TW'] as Lang[],
  en: ['en', 'zh-TW'] as Lang[],
  'zh-TW': ['zh-TW'] as Lang[],
};

export function useTranslations(lang: Lang) {
  const chain = FALLBACK_CHAIN[lang] || [lang, defaultLang];
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    for (const code of chain) {
      const value = (ui as any)[code]?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return (ui as any)[defaultLang]?.[key] ?? String(key);
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, l: string = lang) {
    return !showDefaultLang && l === defaultLang ? path : `/${l}${path}`;
  };
}
