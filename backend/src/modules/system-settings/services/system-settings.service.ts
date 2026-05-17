import { SystemSettingsModel } from "../schemas/system-settings.schema.js";
import type { UpdateSystemSettingsDto } from "../dtos/system-settings.dto.js";

const SINGLETON_KEY = "global";

function toApiModel(settings: Awaited<ReturnType<typeof getOrCreateSettings>>) {
  return {
    defaultLanguage: settings.defaultLanguage,
    defaultTheme: settings.defaultTheme,
    ttsEnabled: settings.ttsEnabled,
    ttsSpeed: settings.ttsSpeed,
    ttsVoice: settings.ttsVoice,
    examIntegrityChecks: settings.examIntegrityChecks,
    allowLateSubmission: settings.allowLateSubmission,
    maxLoginAttempts: settings.maxLoginAttempts,
    updatedAt: settings.updatedAt,
  };
}

async function getOrCreateSettings() {
  return SystemSettingsModel.findOneAndUpdate(
    { singletonKey: SINGLETON_KEY },
    { $setOnInsert: { singletonKey: SINGLETON_KEY } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).orFail();
}

export async function getSystemSettings() {
  const settings = await getOrCreateSettings();
  return toApiModel(settings);
}

export async function updateSystemSettings(input: UpdateSystemSettingsDto) {
  const settings = await SystemSettingsModel.findOneAndUpdate(
    { singletonKey: SINGLETON_KEY },
    { $set: input, $setOnInsert: { singletonKey: SINGLETON_KEY } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).orFail();

  return toApiModel(settings);
}