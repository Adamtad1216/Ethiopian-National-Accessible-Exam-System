import { Types } from "mongoose";
import { ApiError } from "../../../common/middleware/errorHandler.js";
import { ensureStudentExamIsAccessible } from "../../exams/services/exams.service.js";
import { ExamModel } from "../../exams/schemas/exam.schema.js";
import { QuestionModel } from "../../questions/schemas/question.schema.js";
import { UserModel } from "../../users/schemas/user.schema.js";
import { ResponseModel } from "../schemas/response.schema.js";

async function getStudentUserId(userId: string): Promise<string> {
  const user = await UserModel.findById(userId).lean();
  if (!user || user.role !== "student") {
    throw new ApiError(404, "Student user not found");
  }

  return user._id.toString();
}

async function validateExamQuestion(
  examId: string,
  questionId: string,
): Promise<void> {
  const exam = await ExamModel.findById(examId).lean();
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  if (!["published", "completed"].includes(exam.status)) {
    throw new ApiError(400, "Exam is not active");
  }

  const question = await QuestionModel.findById(questionId).lean();
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  if (question.examId.toString() !== examId) {
    throw new ApiError(400, "Question does not belong to exam");
  }

  if (
    question.correctAnswer < 0 ||
    question.correctAnswer >= question.options.length
  ) {
    throw new ApiError(500, "Invalid question configuration");
  }
}

export async function upsertResponse(input: {
  userId: string;
  examId: string;
  questionId: string;
  selectedOption: number;
  answeredAt?: string;
}) {
  await ensureStudentExamIsAccessible(input.examId);
  await validateExamQuestion(input.examId, input.questionId);
  const studentId = await getStudentUserId(input.userId);
  const answeredAt = input.answeredAt ? new Date(input.answeredAt) : new Date();

  const existing = await ResponseModel.findOne({
    studentId,
    examId: input.examId,
    questionId: input.questionId,
  });

  if (existing) {
    if (existing.answeredAt > answeredAt) {
      return { id: existing._id.toString(), ignored: true };
    }

    existing.selectedOption = input.selectedOption;
    existing.answeredAt = answeredAt;
    await existing.save();
    return { id: existing._id.toString(), ignored: false };
  }

  const created = await ResponseModel.create({
    studentId: new Types.ObjectId(studentId),
    examId: new Types.ObjectId(input.examId),
    questionId: new Types.ObjectId(input.questionId),
    selectedOption: input.selectedOption,
    answeredAt,
  });

  return { id: created._id.toString(), ignored: false };
}

export async function syncBatch(
  userId: string,
  responses: Array<{
    examId: string;
    questionId: string;
    selectedOption: number;
    answeredAt?: string;
  }>,
) {
  const results: Array<{ id: string; ignored: boolean }> = [];
  for (const item of responses) {
    const result = await upsertResponse({
      userId,
      examId: item.examId,
      questionId: item.questionId,
      selectedOption: item.selectedOption,
      answeredAt: item.answeredAt,
    });
    results.push(result);
  }

  return results;
}
