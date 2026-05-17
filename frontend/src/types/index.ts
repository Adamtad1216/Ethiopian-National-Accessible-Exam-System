// ===== User & Auth Types =====
export type UserRole = "admin" | "examiner" | "student";

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountNumber?: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Student extends User {
  role: "student";
  nationalId: string;
  school: string;
  grade: string;
  region: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  accountNumber?: string;
  role: "student" | "examiner";
}

// ===== Exam Types =====
export type ExamStatus =
  | "draft"
  | "pending"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "completed";

export interface Exam {
  _id: string;
  title: string;
  titleAm?: string;
  description: string;
  descriptionAm?: string;
  subject: string;
  grade: string;
  duration: number; // minutes
  totalQuestions: number;
  status: ExamStatus;
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
  sections: ExamSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ExamSection {
  _id: string;
  name: string;
  nameAm?: string;
  order: number;
  questionCount: number;
}

// ===== Question Types =====
export type QuestionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected";

export interface QuestionOption {
  _id: string;
  label: string;
  text: string;
  textAm?: string;
}

export interface Question {
  _id: string;
  examId: string;
  sectionId: string;
  questionNumber: number;
  text: string;
  textAm?: string;
  options: QuestionOption[];
  correctOption: string; // option _id
  points: number;
  status: QuestionStatus;
  createdAt: string;
}

// ===== Session & Response Types =====
export type SessionStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "force_submitted";

export interface ExamSession {
  _id: string;
  examId: string;
  studentId: string;
  status: SessionStatus;
  startedAt?: string;
  completedAt?: string;
  remainingTime: number; // seconds
  isOnline: boolean;
  lastSyncAt?: string;
}

export interface StudentResponse {
  _id: string;
  sessionId: string;
  examId: string;
  studentId: string;
  questionId: string;
  selectedOption: string | null;
  answeredAt: string;
  synced: boolean;
}

// ===== Results Types =====
export interface SectionScore {
  sectionId: string;
  sectionName: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface ExamResult {
  _id: string;
  examId: string;
  studentId: string;
  totalCorrect: number;
  totalQuestions: number;
  percentage: number;
  sectionScores: SectionScore[];
  grade: string;
  publishedAt: string;
}

// ===== Audit Types =====
export type AuditAction =
  | "login"
  | "logout"
  | "exam_created"
  | "exam_submitted_approval"
  | "exam_approved"
  | "exam_rejected"
  | "exam_published"
  | "exam_started"
  | "exam_submitted"
  | "exam_force_submitted"
  | "answer_selected"
  | "tab_switch"
  | "copy_attempt"
  | "disconnected"
  | "reconnected"
  | "question_approved"
  | "question_rejected"
  | "user_created"
  | "user_updated"
  | "bulk_import";

export interface AuditLog {
  _id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  details: string;
  examId?: string;
  ip?: string;
  timestamp: string;
}

// ===== System Settings =====
export interface SystemSettings {
  defaultLanguage: "en" | "am";
  defaultTheme: "light" | "dark" | "system";
  ttsEnabled: boolean;
  ttsSpeed: number;
  ttsVoice: string;
  examIntegrityChecks: boolean;
  allowLateSubmission: boolean;
  maxLoginAttempts: number;
}

// ===== Dashboard Stats =====
export interface AdminStats {
  totalStudents: number;
  totalExaminers: number;
  activeExams: number;
  pendingApprovals: number;
  completedExams: number;
  totalQuestions: number;
}

export interface ExaminerStats {
  myExams: number;
  pendingApproval: number;
  publishedExams: number;
  totalQuestions: number;
  avgScore: number;
}

export interface StudentStats {
  assignedExams: number;
  completedExams: number;
  averageScore: number;
  upcomingExams: number;
}

// ===== TTS =====
export interface TTSSettings {
  enabled: boolean;
  language: "en" | "am";
  speed: number;
  voice: string;
  autoRead: boolean;
}

// ===== Preferences =====
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "en" | "am";
  tts: TTSSettings;
  highContrast: boolean;
  fontSize: "normal" | "large" | "xlarge";
}
