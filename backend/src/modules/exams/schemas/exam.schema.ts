import { Schema, model, type InferSchemaType, Types } from "mongoose";

const examSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    titleAmharic: { type: String, required: false, trim: true, default: "" },
    subject: { type: String, required: false, trim: true, default: "General" },
    grade: { type: String, required: false, trim: true, default: "12" },
    description: { type: String, required: false, trim: true, default: "" },
    descriptionAmharic: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "published", "completed"],
      default: "draft",
    },
    startTime: { type: Date, required: false },
    endTime: { type: Date, required: false },
    duration: { type: Number, required: true, min: 1 },
    autoSubmit: { type: Boolean, default: true },
    enableTTS: { type: Boolean, default: true },
    speechRate: {
      type: String,
      enum: ["slow", "normal", "fast"],
      default: "normal",
    },
    autoRepeat: { type: Boolean, default: false },
    keyboardNavigation: { type: Boolean, default: true },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    allowReview: { type: Boolean, default: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export type ExamDocument = InferSchemaType<typeof examSchema>;
export const ExamModel = model("Exam", examSchema);
