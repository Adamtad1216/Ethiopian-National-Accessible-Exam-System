import { Types } from "mongoose";
import { ApiError } from "../../../common/middleware/errorHandler.js";
import { ensureStudentExamIsAccessible } from "../../exams/services/exams.service.js";
import { ExamModel } from "../../exams/schemas/exam.schema.js";
import { QuestionModel } from "../schemas/question.schema.js";

export async function createQuestion(input: {
  examId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  section: string;
}) {
  const exam = await ExamModel.findById(input.examId).lean();
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  if (input.correctAnswer >= input.options.length) {
    throw new ApiError(400, "correctAnswer is out of range");
  }

  const question = await QuestionModel.create({
    examId: new Types.ObjectId(input.examId),
    text: input.text,
    options: input.options,
    correctAnswer: input.correctAnswer,
    section: input.section,
  });

  return { id: question._id.toString() };
}

export async function getQuestionsByExam(
  examId: string,
  includeAnswers = false,
  enforceStudentSchedule = false,
) {
  if (enforceStudentSchedule) {
    await ensureStudentExamIsAccessible(examId);
  }

  const questions = await QuestionModel.find({ examId })
    .sort({ createdAt: 1 })
    .lean();
  return questions.map((question) => ({
    id: question._id.toString(),
    examId: question.examId.toString(),
    text: question.text,
    options: question.options,
    correctAnswer: includeAnswers ? question.correctAnswer : undefined,
    section: question.section,
  }));
}
