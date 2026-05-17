import type { Exam, ExamResult, Question, SystemSettings, User } from "@/types";
import { apiRequest } from "./client";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: "admin" | "examiner" | "student";
    mustChangePassword: boolean;
  };
}

type UserApi = {
  id: string;
  email: string;
  role: User["role"];
  mustChangePassword: boolean;
  firstName?: string;
  lastName?: string;
  accountNumber?: string;
  isActive?: boolean;
};

type ExamApi = {
  id: string;
  title: string;
  titleAmharic?: string;
  subject?: string;
  grade?: string;
  description?: string;
  descriptionAmharic?: string;
  status: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  autoSubmit?: boolean;
  enableTTS?: boolean;
  speechRate?: "slow" | "normal" | "fast";
  autoRepeat?: boolean;
  keyboardNavigation?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowReview?: boolean;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

type ResultApi = {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  sectionScores: Array<{ section: string; score: number; total: number }>;
  updatedAt?: string;
};

export type ExamParticipantResultApi = {
  exam: {
    id: string;
    title: string;
    subject?: string;
    status: string;
  };
  participants: Array<{
    student: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    score: number;
    sectionScores: Array<{ section: string; score: number; total: number }>;
    answers: Array<{
      questionId: string;
      questionNumber: number;
      questionText: string;
      options: string[];
      selectedOption: number | null;
      correctAnswer: number;
      isCorrect: boolean | null;
    }>;
  }>;
};

function mapUser(u: UserApi): User {
  return {
    _id: u.id,
    email: u.email,
    role: u.role,
    firstName: u.firstName ?? u.email.split("@")[0],
    lastName: u.lastName ?? "",
    accountNumber: u.accountNumber,
    isActive: u.isActive ?? true,
    mustChangePassword: u.mustChangePassword,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapExam(e: ExamApi): Exam {
  return {
    _id: e.id,
    title: e.title,
    titleAm: e.titleAmharic,
    description: e.description ?? "",
    descriptionAm: e.descriptionAmharic,
    subject: e.subject ?? "General",
    grade: e.grade ?? "12",
    duration: e.duration,
    totalQuestions: 0,
    status: e.status as Exam["status"],
    startTime: e.startTime,
    endTime: e.endTime,
    autoSubmit: e.autoSubmit,
    enableTTS: e.enableTTS,
    speechRate: e.speechRate,
    autoRepeat: e.autoRepeat,
    keyboardNavigation: e.keyboardNavigation,
    shuffleQuestions: e.shuffleQuestions,
    shuffleOptions: e.shuffleOptions,
    allowReview: e.allowReview,
    createdBy: e.createdBy,
    sections: [],
    createdAt: e.createdAt ?? new Date().toISOString(),
    updatedAt: e.updatedAt ?? new Date().toISOString(),
  };
}

function mapResult(r: ResultApi): ExamResult {
  const totalQuestions = r.sectionScores.reduce((acc, s) => acc + s.total, 0);
  const totalCorrect = r.sectionScores.reduce((acc, s) => acc + s.score, 0);
  return {
    _id: r.id,
    examId: r.examId,
    studentId: r.studentId,
    totalCorrect,
    totalQuestions,
    percentage: r.score,
    sectionScores: r.sectionScores.map((s) => ({
      sectionId: s.section,
      sectionName: s.section,
      correct: s.score,
      total: s.total,
      percentage: s.total > 0 ? Math.round((s.score / s.total) * 100) : 0,
    })),
    grade: r.score >= 70 ? "A" : r.score >= 50 ? "B" : "C",
    publishedAt: r.updatedAt ?? new Date().toISOString(),
  };
}

type ResultReviewApi = {
  exam: {
    id: string;
    title: string;
    subject?: string;
  };
  result: {
    id: string;
    score: number;
    updatedAt?: string;
  } | null;
  questions: Array<{
    id: string;
    text: string;
    options: string[];
    selectedOption: number | null;
    correctAnswer: number;
    isCorrect: boolean | null;
    answeredAt?: string;
  }>;
};

type SystemSettingsApi = SystemSettings & {
  updatedAt?: string;
};

export async function loginApi(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });
}

export async function registerStudentApi(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  accountNumber?: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/register", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUserApi(): Promise<User> {
  const me = await apiRequest<UserApi>("/users/me");
  return mapUser(me);
}

export async function getSystemSettingsApi(): Promise<SystemSettings> {
  const settings = await apiRequest<SystemSettingsApi>("/system-settings", {
    skipAuth: true,
  });

  return {
    defaultLanguage: settings.defaultLanguage,
    defaultTheme: settings.defaultTheme,
    ttsEnabled: settings.ttsEnabled,
    ttsSpeed: settings.ttsSpeed,
    ttsVoice: settings.ttsVoice,
    examIntegrityChecks: settings.examIntegrityChecks,
    allowLateSubmission: settings.allowLateSubmission,
    maxLoginAttempts: settings.maxLoginAttempts,
  };
}

export async function updateSystemSettingsApi(
  payload: SystemSettings,
): Promise<SystemSettings> {
  const settings = await apiRequest<SystemSettingsApi>("/system-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return {
    defaultLanguage: settings.defaultLanguage,
    defaultTheme: settings.defaultTheme,
    ttsEnabled: settings.ttsEnabled,
    ttsSpeed: settings.ttsSpeed,
    ttsVoice: settings.ttsVoice,
    examIntegrityChecks: settings.examIntegrityChecks,
    allowLateSubmission: settings.allowLateSubmission,
    maxLoginAttempts: settings.maxLoginAttempts,
  };
}

export async function getUsersApi(): Promise<User[]> {
  const users = await apiRequest<UserApi[]>("/users");
  return users.map(mapUser);
}

export async function createUserApi(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  accountNumber?: string;
  role: "student" | "examiner";
}): Promise<User> {
  const user = await apiRequest<UserApi>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapUser(user);
}

export async function updateUserApi(
  userId: string,
  payload: {
    firstName: string;
    lastName?: string;
    role: "admin" | "examiner" | "student";
    isActive: boolean;
  },
): Promise<User> {
  const user = await apiRequest<UserApi>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapUser(user);
}

export async function deleteUserApi(userId: string): Promise<void> {
  await apiRequest<void>(`/users/${userId}`, {
    method: "DELETE",
  });
}

export async function getAllExamsApi(): Promise<Exam[]> {
  const exams = await apiRequest<ExamApi[]>("/exams");
  return exams.map(mapExam);
}

export async function getAssignedExamsApi(): Promise<Exam[]> {
  const exams = await apiRequest<ExamApi[]>("/exams/assigned");
  return exams.map(mapExam);
}

export async function createExamApi(payload: {
  title: string;
  titleAmharic?: string;
  subject?: string;
  grade?: string;
  description?: string;
  descriptionAmharic?: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  autoSubmit?: boolean;
  enableTTS?: boolean;
  speechRate?: "slow" | "normal" | "fast";
  autoRepeat?: boolean;
  keyboardNavigation?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowReview?: boolean;
}): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateExamApi(
  examId: string,
  payload: {
    title?: string;
    titleAmharic?: string;
    subject?: string;
    grade?: string;
    description?: string;
    descriptionAmharic?: string;
    duration?: number;
    startTime?: string;
    endTime?: string;
    autoSubmit?: boolean;
    enableTTS?: boolean;
    speechRate?: "slow" | "normal" | "fast";
    autoRepeat?: boolean;
    keyboardNavigation?: boolean;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    allowReview?: boolean;
  },
): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(`/exams/${examId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function requestApprovalApi(
  examId: string,
): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(
    `/exams/${examId}/request-approval`,
    {
      method: "POST",
    },
  );
}

export async function approveExamApi(
  examId: string,
): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(
    `/exams/${examId}/approve`,
    {
      method: "POST",
    },
  );
}

export async function publishExamApi(
  examId: string,
): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>(
    `/exams/${examId}/publish`,
    {
      method: "POST",
    },
  );
}

export async function getExamQuestionsApi(examId: string): Promise<Question[]> {
  const questions = await apiRequest<
    Array<{
      id: string;
      examId: string;
      text: string;
      options: string[];
      correctAnswer?: number;
      section: string;
    }>
  >(`/questions/exam/${examId}`);

  return questions.map((q, index) => ({
    _id: q.id,
    examId: q.examId,
    sectionId: q.section,
    questionNumber: index + 1,
    text: q.text,
    options: q.options.map((option, i) => ({
      _id: `${q.id}-${i}`,
      label: String.fromCharCode(65 + i),
      text: option,
    })),
    correctOption:
      typeof q.correctAnswer === "number" ? `${q.id}-${q.correctAnswer}` : "",
    points: 1,
    status: "approved",
    createdAt: new Date().toISOString(),
  }));
}

export async function createQuestionApi(payload: {
  examId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  section: string;
}): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitResponseApi(payload: {
  examId: string;
  questionId: string;
  selectedOption: number;
  answeredAt?: string;
}): Promise<{ id: string; ignored: boolean }> {
  return apiRequest<{ id: string; ignored: boolean }>("/responses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function syncResponsesApi(payload: {
  responses: Array<{
    examId: string;
    questionId: string;
    selectedOption: number;
    answeredAt?: string;
  }>;
}): Promise<{ synced: Array<{ id: string; ignored: boolean }> }> {
  return apiRequest<{ synced: Array<{ id: string; ignored: boolean }> }>(
    "/responses/sync",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function gradeExamApi(examId: string): Promise<{
  id: string;
  score: number;
  examId: string;
  sectionScores: Array<{ section: string; score: number; total: number }>;
}> {
  return apiRequest(`/results/grade/${examId}`, { method: "POST" });
}

export async function getMyResultsApi(): Promise<ExamResult[]> {
  const results = await apiRequest<ResultApi[]>("/results/me");
  return results.map(mapResult);
}

export async function getResultReviewApi(
  examId: string,
): Promise<ResultReviewApi> {
  return apiRequest<ResultReviewApi>(`/results/me/${examId}/review`);
}

export async function getAllResultsApi(): Promise<ExamResult[]> {
  const results = await apiRequest<ResultApi[]>("/results");
  return results.map(mapResult);
}

export async function getExamParticipantResultsApi(
  examId: string,
): Promise<ExamParticipantResultApi> {
  return apiRequest<ExamParticipantResultApi>(
    `/results/exam/${examId}/details`,
  );
}

export async function getAuditLogsApi(): Promise<
  Array<{
    _id: string;
    userName: string;
    action: string;
    details: string | Record<string, unknown>;
    timestamp: string;
  }>
> {
  const logs = await apiRequest<
    Array<{
      id: string;
      userId: string;
      userName?: string;
      action: string;
      metadata: Record<string, unknown>;
      timestamp: string;
    }>
  >("/audit");
  return logs.map((log) => ({
    _id: log.id,
    userName: log.userName ?? log.userId,
    action: log.action,
    details: log.metadata,
    timestamp: log.timestamp,
  }));
}
