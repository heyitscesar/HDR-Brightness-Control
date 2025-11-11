import { useCallback } from 'react';
import translations from '../translations/en.json';

// The type of keys will be inferred directly from the JSON file,
// providing excellent type safety and autocompletion.
// e.g., "header.title" | "demo.banner"
export type TranslationKey = keyof typeof translations;

/**
 * A custom hook for handling internationalization (i18n).
 * It provides a type-safe `t` function to retrieve and format translation strings.
 */
export const useI18n = () => {
  /**
   * Translates a given key into a string.
   * @param key The key of the translation string to retrieve.
   * @param replacements An optional object of placeholders to replace in the string.
   * @returns The translated and formatted string.
   */
  const t = useCallback((key: TranslationKey, replacements?: Record<string, string | number>): string => {
    // Use direct, type-safe property access.
    // TypeScript ensures that `key` is a valid key of `translations`.
    const translationTemplate = translations[key];

    // This check acts as a safeguard in the rare case a key is missing or not a string.
    if (typeof translationTemplate !== 'string') {
      console.warn(`Translation for key '${String(key)}' not found or is not a string.`);
      return String(key);
    }

    let result = translationTemplate;
    if (replacements) {
      // Iterate over replacements and substitute placeholders.
      for (const [placeholder, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
        result = result.replace(regex, String(value));
      }
    }

    return result;
  }, []);

  return { t };
};
