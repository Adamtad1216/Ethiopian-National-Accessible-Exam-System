import { Schema, model, type InferSchemaType, Types } from "mongoose";

const responseSchema = new Schema(
  {
    studentId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    questionId: {
      type: Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    selectedOption: { type: Number, required: true, min: 0 },
    answeredAt: { type: Date, required: true },
  },
  { timestamps: true },
);

responseSchema.index(
  { studentId: 1, examId: 1, questionId: 1 },
  { unique: true },
);

export type ResponseDocument = InferSchemaType<typeof responseSchema>;
export const ResponseModel = model("Response", responseSchema);
