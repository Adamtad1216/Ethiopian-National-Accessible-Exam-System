import { z } from "zod";

export const updateSystemSettingsDto = z.object({
  defaultLanguage: z.enum(["en", "am"]),
  defaultTheme: z.enum(["light", "dark", "system"]),
  ttsEnabled: z.boolean(),
  ttsSpeed: z.number().min(0.5).max(2),
  ttsVoice: z.string().min(1),
  examIntegrityChecks: z.boolean(),
  allowLateSubmission: z.boolean(),
  maxLoginAttempts: z.number().int().min(3).max(10),
});

export type UpdateSystemSettingsDto = z.infer<typeof updateSystemSettingsDto>;