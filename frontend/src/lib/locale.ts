export type AppLanguage = "en" | "am";

export function resolveLanguage(language?: string): AppLanguage {
  if (!language) return "en";
  const normalized = language.trim().toLowerCase();
  if (
    normalized === "am" ||
    normalized === "am-et" ||
    normalized === "am_et" ||
    normalized === "amharic" ||
    normalized.includes("amhar")
  ) {
    return "am";
  }
  return "en";
}

export function pickText(
  language: AppLanguage,
  englishText: string,
  amharicText: string,
): string {
  return language === "am" ? amharicText : englishText;
}
