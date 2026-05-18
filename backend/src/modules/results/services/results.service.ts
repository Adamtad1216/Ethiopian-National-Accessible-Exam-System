import { Types } from "mongoose";
import { ApiError } from "../../../common/middleware/errorHandler.js";
import { ExamModel } from "../../exams/schemas/exam.schema.js";
import { QuestionModel } from "../../questions/schemas/question.schema.js";
import { ResponseModel } from "../../responses/schemas/response.schema.js";
import { UserModel } from "../../users/schemas/user.schema.js";
import { ResultModel } from "../schemas/result.schema.js";

export function calculateScore(
  questions: Array<{ id: string; section: string; correctAnswer: number }>,
  responses: Map<string, number>,
): {
  score: number;
  sectionScores: Array<{ section: string; score: number; total: number }>;
} {
  let correct = 0;
  const sectionMeta = new Map<string, { correct: number; total: number }>();

  for (const question of questions) {
    const selected = responses.get(question.id);
    const section = question.section || "General";
    const current = sectionMeta.get(section) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (selected === question.correctAnswer) {
      correct += 1;
      current.correct += 1;
    }
    sectionMeta.set(section, current);
  }

  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const sectionScores = Array.from(sectionMeta.entries()).map(
    ([section, v]) => ({
      section,
      score: v.correct,
      total: v.total,
    }),
  );

  return { score, sectionScores };
}

async function getStudentId(userId: string): Promise<string> {
  const student = await UserModel.findById(userId).lean();
  if (!student || student.role !== "student") {
    throw new ApiError(404, "Student user not found");
  }

  return student._id.toString();
}

async function gradeExamForStudentId(studentId: string, examId: string) {
  const [questions, responses] = await Promise.all([
    QuestionModel.find({ examId }).lean(),
    ResponseModel.find({ studentId, examId }).lean(),
  ]);

  if (questions.length === 0) {
    throw new ApiError(400, "Exam has no questions");
  }

  const responseMap = new Map(
    responses.map((r) => [r.questionId.toString(), r.selectedOption]),
  );

  const { score, sectionScores } = calculateScore(
    questions.map((q) => ({
      id: q._id.toString(),
      section: q.section,
      correctAnswer: q.correctAnswer,
    })),
    responseMap,
  );

  const result = await ResultModel.findOneAndUpdate(
    { studentId, examId },
    {
      studentId: new Types.ObjectId(studentId),
      examId: new Types.ObjectId(examId),
      score,
      sectionScores,
    },
    { upsert: true, new: true },
  ).lean();

  return {
    id: result!._id.toString(),
    studentId,
    examId,
    score,
    sectionScores,
  };
}

export async function gradeExamForStudent(userId: string, examId: string) {
  const exam = await ExamModel.findById(examId);

  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  if (!exam.startTime || !exam.endTime) {
    throw new ApiError(400, "Exam schedule is not configured");
  }

  const now = Date.now();
  if (now < exam.startTime.getTime()) {
    throw new ApiError(403, "Exam has not started yet");
  }

  if (exam.status === "published" && now > exam.endTime.getTime()) {
    exam.status = "completed";
    await exam.save();
  }

  if (!["published", "completed"].includes(exam.status)) {
    throw new ApiError(400, "Exam is not available for grading");
  }

  const studentId = await getStudentId(userId);
  return gradeExamForStudentId(studentId, examId);
}

export async function gradeExamForAllParticipants(examId: string) {
  const studentIds = await ResponseModel.distinct("studentId", { examId });
  for (const studentId of studentIds) {
    await gradeExamForStudentId(String(studentId), examId);
  }
}

export async function getResultsForStudent(userId: string) {
  const studentId = await getStudentId(userId);
  const results = await ResultModel.find({ studentId })
    .sort({ updatedAt: -1 })
    .lean();

  return results.map((result) => ({
    id: result._id.toString(),
    studentId: result.studentId.toString(),
    examId: result.examId.toString(),
    score: result.score,
    sectionScores: result.sectionScores,
    updatedAt: result.updatedAt,
  }));
}

export async function getAllResults() {
  const results = await ResultModel.find().sort({ updatedAt: -1 }).lean();
  const studentIds = Array.from(new Set(results.map((r) => r.studentId.toString())));
  const students = await UserModel.find({ _id: { $in: studentIds } }).lean();
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

  return results.map((result) => {
    const student = studentMap.get(result.studentId.toString());
    const studentName = student
      ? `${student.firstName} ${student.lastName}`.trim()
      : result.studentId.toString();

    return {
      id: result._id.toString(),
      studentId: result.studentId.toString(),
      studentName,
      examId: result.examId.toString(),
      score: result.score,
      sectionScores: result.sectionScores,
      updatedAt: result.updatedAt,
    };
  });
}

export async function getResultReviewForStudent(userId: string, examId: string) {
  const studentId = await getStudentId(userId);

  const [exam, result, questions, responses] = await Promise.all([
    ExamModel.findById(examId).lean(),
    ResultModel.findOne({ studentId, examId }).lean(),
    QuestionModel.find({ examId }).sort({ createdAt: 1 }).lean(),
    ResponseModel.find({ studentId, examId }).lean(),
  ]);

  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  const responseByQuestionId = new Map(
    responses.map((response) => [response.questionId.toString(), response]),
  );

  const reviewedQuestions = questions.map((question) => {
    const response = responseByQuestionId.get(question._id.toString());
    const selectedOption = response?.selectedOption;
    const isCorrect =
      typeof selectedOption === "number"
        ? selectedOption === question.correctAnswer
        : null;

    return {
      id: question._id.toString(),
      questionNumber: null,
      text: question.text,
      options: question.options,
      selectedOption: typeof selectedOption === "number" ? selectedOption : null,
      correctAnswer: question.correctAnswer,
      isCorrect,
      answeredAt: response?.answeredAt,
    };
  });

  return {
    exam: {
      id: exam._id.toString(),
      title: exam.title,
      subject: exam.subject,
    },
    result: result
      ? {
          id: result._id.toString(),
          score: result.score,
          updatedAt: result.updatedAt,
        }
      : null,
    questions: reviewedQuestions,
  };
}

export async function getExamParticipantResults(
  examId: string,
  requester: { userId: string; role: "admin" | "examiner" },
) {
  const [exam, questions, results, responses] = await Promise.all([
    ExamModel.findById(examId).lean(),
    QuestionModel.find({ examId }).sort({ createdAt: 1 }).lean(),
    ResultModel.find({ examId }).lean(),
    ResponseModel.find({ examId }).lean(),
  ]);

  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }

  if (
    requester.role === "examiner" &&
    exam.createdBy.toString() !== requester.userId
  ) {
    throw new ApiError(403, "You do not have access to this exam's results");
  }

  const studentIds = Array.from(
    new Set([
      ...responses.map((response) => response.studentId.toString()),
      ...results.map((result) => result.studentId.toString()),
    ]),
  );

  const students = await UserModel.find({ _id: { $in: studentIds } }).lean();
  const studentById = new Map(students.map((student) => [student._id.toString(), student]));
  const resultByStudentId = new Map(
    results.map((result) => [result.studentId.toString(), result]),
  );

  const responseByStudent = new Map<string, Map<string, number>>();
  for (const response of responses) {
    const studentId = response.studentId.toString();
    const questionMap = responseByStudent.get(studentId) ?? new Map<string, number>();
    questionMap.set(response.questionId.toString(), response.selectedOption);
    responseByStudent.set(studentId, questionMap);
  }

  const participants = studentIds.map((studentId) => {
    const student = studentById.get(studentId);
    const responseMap = responseByStudent.get(studentId) ?? new Map<string, number>();
    const savedResult = resultByStudentId.get(studentId);
    const computed = calculateScore(
      questions.map((question) => ({
        id: question._id.toString(),
        section: question.section,
        correctAnswer: question.correctAnswer,
      })),
      responseMap,
    );

    const score = savedResult?.score ?? computed.score;
    const sectionScores = savedResult?.sectionScores ?? computed.sectionScores;

    return {
      student: {
        id: studentId,
        firstName: student?.firstName ?? "",
        lastName: student?.lastName ?? "",
        email: student?.email ?? "",
      },
      score,
      sectionScores,
      answers: questions.map((question, index) => {
        const selectedOption = responseMap.get(question._id.toString());
        const isCorrect =
          typeof selectedOption === "number"
            ? selectedOption === question.correctAnswer
            : null;

        return {
          questionId: question._id.toString(),
          questionNumber: index + 1,
          questionText: question.text,
          options: question.options,
          selectedOption:
            typeof selectedOption === "number" ? selectedOption : null,
          correctAnswer: question.correctAnswer,
          isCorrect,
        };
      }),
    };
  });

  return {
    exam: {
      id: exam._id.toString(),
      title: exam.title,
      subject: exam.subject,
      status: exam.status,
    },
    participants,
  };
}
