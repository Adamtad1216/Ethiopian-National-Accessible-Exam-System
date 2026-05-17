import { Types } from "mongoose";
import { ApiError } from "../../../common/middleware/errorHandler.js";
import { gradeExamForAllParticipants } from "../../results/services/results.service.js";
import { getTodayWindow, isWithinScheduledWindow } from "../utils/schedule.js";
import { ExamModel } from "../schemas/exam.schema.js";

export async function finalizeEndedPublishedExams(): Promise<number> {
  const now = new Date();
  const endedExams = await ExamModel.find({
    status: "published",
    endTime: { $exists: true, $ne: null, $lte: now },
  }).lean();

  for (const exam of endedExams) {
    await gradeExamForAllParticipants(exam._id.toString());
    await ExamModel.updateOne(
      { _id: exam._id, status: "published" },
      { $set: { status: "completed" } },
    );
  }

  return endedExams.length;
}

export async function ensureStudentExamIsAccessible(
  examId: string,
): Promise<void> {
  await finalizeEndedPublishedExams();

  const exam = await ExamModel.findById(examId).lean();
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  if (!isWithinScheduledWindow(exam)) {
    throw new ApiError(
      403,
      "Exam is not currently available. You can only take exams during their scheduled time.",
    );
  }
}

export async function listExams(): Promise<Array<Record<string, unknown>>> {
  const exams = await ExamModel.find().sort({ createdAt: -1 }).lean();
  return exams.map((exam) => ({
    id: exam._id.toString(),
    title: exam.title,
    titleAmharic: exam.titleAmharic,
    subject: exam.subject,
    grade: exam.grade,
    description: exam.description,
    descriptionAmharic: exam.descriptionAmharic,
    status: exam.status,
    startTime: exam.startTime,
    endTime: exam.endTime,
    duration: exam.duration,
    autoSubmit: exam.autoSubmit,
    enableTTS: exam.enableTTS,
    speechRate: exam.speechRate,
    autoRepeat: exam.autoRepeat,
    keyboardNavigation: exam.keyboardNavigation,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    allowReview: exam.allowReview,
    createdBy: exam.createdBy.toString(),
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  }));
}

export async function listAssignedExams(): Promise<
  Array<Record<string, unknown>>
> {
  await finalizeEndedPublishedExams();
  const { startOfToday, startOfTomorrow } = getTodayWindow();

  const exams = await ExamModel.find({
    status: "published",
    startTime: {
      $gte: startOfToday,
      $lt: startOfTomorrow,
    },
  })
    .sort({ startTime: 1 })
    .lean();
  return exams.map((exam) => ({
    id: exam._id.toString(),
    title: exam.title,
    status: exam.status,
    startTime: exam.startTime,
    endTime: exam.endTime,
    duration: exam.duration,
    createdBy: exam.createdBy.toString(),
  }));
}

export async function createExam(input: {
  title: string;
  titleAmharic?: string;
  subject?: string;
  grade?: string;
  description?: string;
  descriptionAmharic?: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  autoSubmit?: boolean;
  enableTTS?: boolean;
  speechRate?: "slow" | "normal" | "fast";
  autoRepeat?: boolean;
  keyboardNavigation?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowReview?: boolean;
  createdBy: string;
}) {
  const exam = await ExamModel.create({
    title: input.title,
    titleAmharic: input.titleAmharic,
    subject: input.subject,
    grade: input.grade,
    description: input.description,
    descriptionAmharic: input.descriptionAmharic,
    startTime: input.startTime ? new Date(input.startTime) : undefined,
    endTime: input.endTime ? new Date(input.endTime) : undefined,
    duration: input.duration,
    autoSubmit: input.autoSubmit,
    enableTTS: input.enableTTS,
    speechRate: input.speechRate,
    autoRepeat: input.autoRepeat,
    keyboardNavigation: input.keyboardNavigation,
    shuffleQuestions: input.shuffleQuestions,
    shuffleOptions: input.shuffleOptions,
    allowReview: input.allowReview,
    createdBy: new Types.ObjectId(input.createdBy),
  });

  return { id: exam._id.toString() };
}

export async function updateExam(
  examId: string,
  input: {
    title?: string;
    titleAmharic?: string;
    subject?: string;
    grade?: string;
    description?: string;
    descriptionAmharic?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    autoSubmit?: boolean;
    enableTTS?: boolean;
    speechRate?: "slow" | "normal" | "fast";
    autoRepeat?: boolean;
    keyboardNavigation?: boolean;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    allowReview?: boolean;
  },
  actor: { userId: string; role: "admin" | "examiner" },
) {
  const exam = await ExamModel.findById(examId);
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  if (actor.role === "examiner" && exam.createdBy.toString() !== actor.userId) {
    throw new ApiError(403, "You can only update exams that you created");
  }

  if (exam.status === "completed") {
    throw new ApiError(400, "Completed exams cannot be edited");
  }

  if (typeof input.title !== "undefined") exam.title = input.title;
  if (typeof input.titleAmharic !== "undefined")
    exam.titleAmharic = input.titleAmharic;
  if (typeof input.subject !== "undefined") exam.subject = input.subject;
  if (typeof input.grade !== "undefined") exam.grade = input.grade;
  if (typeof input.description !== "undefined")
    exam.description = input.description;
  if (typeof input.descriptionAmharic !== "undefined")
    exam.descriptionAmharic = input.descriptionAmharic;
  if (typeof input.startTime !== "undefined")
    exam.startTime = new Date(input.startTime);
  if (typeof input.endTime !== "undefined")
    exam.endTime = new Date(input.endTime);
  if (typeof input.duration !== "undefined") exam.duration = input.duration;
  if (typeof input.autoSubmit !== "undefined")
    exam.autoSubmit = input.autoSubmit;
  if (typeof input.enableTTS !== "undefined") exam.enableTTS = input.enableTTS;
  if (typeof input.speechRate !== "undefined")
    exam.speechRate = input.speechRate;
  if (typeof input.autoRepeat !== "undefined")
    exam.autoRepeat = input.autoRepeat;
  if (typeof input.keyboardNavigation !== "undefined")
    exam.keyboardNavigation = input.keyboardNavigation;
  if (typeof input.shuffleQuestions !== "undefined")
    exam.shuffleQuestions = input.shuffleQuestions;
  if (typeof input.shuffleOptions !== "undefined")
    exam.shuffleOptions = input.shuffleOptions;
  if (typeof input.allowReview !== "undefined")
    exam.allowReview = input.allowReview;

  await exam.save();
  return {
    id: exam._id.toString(),
    status: exam.status,
  };
}

export async function setStatus(
  examId: string,
  status: "pending" | "approved" | "published" | "completed",
) {
  const exam = await ExamModel.findByIdAndUpdate(
    examId,
    { status },
    { new: true },
  ).lean();
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  return {
    id: exam._id.toString(),
    status: exam.status,
  };
}

export async function getExamById(examId: string) {
  const exam = await ExamModel.findById(examId).lean();
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  return {
    id: exam._id.toString(),
    title: exam.title,
    titleAmharic: exam.titleAmharic,
    subject: exam.subject,
    grade: exam.grade,
    description: exam.description,
    descriptionAmharic: exam.descriptionAmharic,
    status: exam.status,
    startTime: exam.startTime,
    endTime: exam.endTime,
    duration: exam.duration,
    autoSubmit: exam.autoSubmit,
    enableTTS: exam.enableTTS,
    speechRate: exam.speechRate,
    autoRepeat: exam.autoRepeat,
    keyboardNavigation: exam.keyboardNavigation,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    allowReview: exam.allowReview,
    createdBy: exam.createdBy.toString(),
  };
}
