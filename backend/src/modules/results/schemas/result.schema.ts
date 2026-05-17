import { Schema, model, type InferSchemaType, Types } from "mongoose";

const sectionScoreSchema = new Schema(
  {
    section: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const resultSchema = new Schema(
  {
    studentId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    score: { type: Number, required: true, min: 0 },
    sectionScores: { type: [sectionScoreSchema], default: [] },
  },
  { timestamps: true },
);

resultSchema.index({ studentId: 1, examId: 1 }, { unique: true });

export type ResultDocument = InferSchemaType<typeof resultSchema>;
export const ResultModel = model("Result", resultSchema);
