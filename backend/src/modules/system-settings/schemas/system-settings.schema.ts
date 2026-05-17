import { Schema, model, type InferSchemaType } from "mongoose";

const systemSettingsSchema = new Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      default: "global",
    },
    defaultLanguage: {
      type: String,
      enum: ["en", "am"],
      default: "en",
    },
    defaultTheme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    ttsEnabled: { type: Boolean, default: true },
    ttsSpeed: { type: Number, min: 0.5, max: 2, default: 1 },
    ttsVoice: { type: String, default: "default" },
    examIntegrityChecks: { type: Boolean, default: true },
    allowLateSubmission: { type: Boolean, default: false },
    maxLoginAttempts: { type: Number, min: 3, max: 10, default: 5 },
  },
  { timestamps: true },
);

export type SystemSettingsDocument = InferSchemaType<typeof systemSettingsSchema>;
export const SystemSettingsModel = model("SystemSettings", systemSettingsSchema);