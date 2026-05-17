import { Schema, model, type InferSchemaType, Types } from "mongoose";

const questionSchema = new Schema(
  {
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    text: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length >= 2,
        message: "At least two options are required",
      },
    },
    correctAnswer: { type: Number, required: true, min: 0 },
    section: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type QuestionDocument = InferSchemaType<typeof questionSchema>;
export const QuestionModel = model("Question", questionSchema);
