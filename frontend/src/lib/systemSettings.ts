import type { SystemSettings, UserPreferences } from "@/types";
import { resolveLanguage } from "@/lib/locale";

export const defaultSystemSettings: SystemSettings = {
  defaultLanguage: "en",
  defaultTheme: "system",
  ttsEnabled: true,
  ttsSpeed: 1,
  ttsVoice: "default",
  examIntegrityChecks: true,
  allowLateSubmission: false,
  maxLoginAttempts: 5,
};

export function applySystemDefaultsToPreferences(
  preferences: UserPreferences,
  settings: SystemSettings,
): UserPreferences {
  const normalizedLanguage = resolveLanguage(settings.defaultLanguage);
  return {
    ...preferences,
    theme: settings.defaultTheme,
    language: normalizedLanguage,
    tts: {
      ...preferences.tts,
      enabled: settings.ttsEnabled,
      language: normalizedLanguage,
      speed: settings.ttsSpeed,
      voice: settings.ttsVoice,
    },
  };
}
