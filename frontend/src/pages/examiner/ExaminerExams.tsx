import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllExamsApi,
  requestApprovalApi,
  updateExamApi,
  createExamApi,
  createQuestionApi,
} from "@/features/examiner/services/examinerService";
import {
  Plus,
  FileText,
  Edit,
  Send,
  Eye,
  Upload,
  Download,
} from "lucide-react";
import type { Exam } from "@/types";
import { toast } from "sonner";

type ImportedQuestion = {
  questionText: string;
  options: string[];
  correctAnswer: "A" | "B" | "C" | "D";
  marks?: number;
  section?: string;
};

type ImportedExam = {
  exam: {
    examTitle: string;
    examTitleAmharic?: string;
    subject: string;
    grade?: string;
    description?: string;
    descriptionAmharic?: string;
    duration: number;
    startDate?: string;
    endDate?: string;
    autoSubmit?: boolean;
    enableTTS?: boolean;
    speechRate?: "slow" | "normal" | "fast";
    autoRepeat?: boolean;
    keyboardNavigation?: boolean;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    allowReview?: boolean;
  };
  questions: ImportedQuestion[];
};

type ImportTemplateRow = {
  examTitle: string;
  examTitleAmharic?: string;
  subject: string;
  grade?: string;
  description?: string;
  descriptionAmharic?: string;
  duration: number;
  startDate?: string;
  endDate?: string;
  autoSubmit?: string;
  enableTTS?: string;
  speechRate?: string;
  autoRepeat?: string;
  keyboardNavigation?: string;
  shuffleQuestions?: string;
  shuffleOptions?: string;
  allowReview?: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  marks?: number;
  section?: string;
};

const templateColumns: Array<keyof ImportTemplateRow> = [
  "examTitle",
  "examTitleAmharic",
  "subject",
  "grade",
  "description",
  "descriptionAmharic",
  "duration",
  "startDate",
  "endDate",
  "autoSubmit",
  "enableTTS",
  "speechRate",
  "autoRepeat",
  "keyboardNavigation",
  "shuffleQuestions",
  "shuffleOptions",
  "allowReview",
  "questionText",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctAnswer",
  "marks",
  "section",
];

const importTemplateRows: ImportTemplateRow[] = [
  {
    examTitle: "Physics National Exam",
    examTitleAmharic: "የፊዚክስ ብሔራዊ ፈተና",
    subject: "physics",
    grade: "12",
    description: "National-level physics exam for grade 12.",
    descriptionAmharic: "ለ12ኛ ክፍል የብሔራዊ ፊዚክስ ፈተና።",
    duration: 120,
    startDate: "2026-04-15T09:00:00.000Z",
    endDate: "2026-04-15T11:00:00.000Z",
    autoSubmit: "true",
    enableTTS: "true",
    speechRate: "normal",
    autoRepeat: "false",
    keyboardNavigation: "true",
    shuffleQuestions: "false",
    shuffleOptions: "false",
    allowReview: "true",
    questionText: "What is the SI unit of force?",
    optionA: "Joule",
    optionB: "Newton",
    optionC: "Watt",
    optionD: "Pascal",
    correctAnswer: "B",
    marks: 1,
    section: "physics",
  },
  {
    examTitle: "Physics National Exam",
    examTitleAmharic: "የፊዚክስ ብሔራዊ ፈተና",
    subject: "physics",
    grade: "12",
    description: "National-level physics exam for grade 12.",
    descriptionAmharic: "ለ12ኛ ክፍል የብሔራዊ ፊዚክስ ፈተና።",
    duration: 120,
    startDate: "2026-04-15T09:00:00.000Z",
    endDate: "2026-04-15T11:00:00.000Z",
    autoSubmit: "true",
    enableTTS: "true",
    speechRate: "normal",
    autoRepeat: "false",
    keyboardNavigation: "true",
    shuffleQuestions: "false",
    shuffleOptions: "false",
    allowReview: "true",
    questionText:
      "Which law states that for every action there is an equal and opposite reaction?",
    optionA: "Newton's First Law",
    optionB: "Newton's Second Law",
    optionC: "Newton's Third Law",
    optionD: "Law of Gravitation",
    correctAnswer: "C",
    marks: 1,
    section: "physics",
  },
];

const parseBooleanCell = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeCellString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
};

const toOptionalTrimmedString = (value: unknown) => {
  const trimmed = normalizeCellString(value);
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRequiredTrimmedString = (value: unknown) => normalizeCellString(value);

const parseDuration = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const asNumber = Number(value.trim());
    return Number.isFinite(asNumber) ? asNumber : Number.NaN;
  }
  return Number.NaN;
};

const sanitizeHeaderKey = (key: string) => key.replace(/^\uFEFF/, "").trim();

const normalizeRowKeys = (row: Record<string, unknown>) => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[sanitizeHeaderKey(key)] = value;
  }
  return normalized;
};

const decodeCsvText = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(bytes.length - (bytes.length % 2));
    for (let i = 0; i < swapped.length; i += 2) {
      swapped[i] = bytes[i + 1];
      swapped[i + 1] = bytes[i];
    }
    return new TextDecoder("utf-16le").decode(swapped);
  }
  return new TextDecoder("utf-8").decode(bytes);
};

const parseImportedExam = (
  rawRows: Array<Record<string, unknown>>,
): ImportedExam => {
  const rows = rawRows.map(normalizeRowKeys);
  if (rows.length === 0) {
    throw new Error("The file is empty. Add at least one question row.");
  }

  const first = rows[0];
  const speechRateCell = toOptionalTrimmedString(first.speechRate);
  const exam: ImportedExam["exam"] = {
    examTitle: toRequiredTrimmedString(first.examTitle),
    examTitleAmharic: toOptionalTrimmedString(first.examTitleAmharic),
    subject: toRequiredTrimmedString(first.subject),
    grade: toOptionalTrimmedString(first.grade),
    description: toOptionalTrimmedString(first.description),
    descriptionAmharic: toOptionalTrimmedString(first.descriptionAmharic),
    duration: parseDuration(first.duration),
    startDate: toOptionalTrimmedString(first.startDate),
    endDate: toOptionalTrimmedString(first.endDate),
    autoSubmit: parseBooleanCell(first.autoSubmit, true),
    enableTTS: parseBooleanCell(first.enableTTS, true),
    speechRate:
      speechRateCell === "slow" || speechRateCell === "fast"
        ? speechRateCell
        : "normal",
    autoRepeat: parseBooleanCell(first.autoRepeat, false),
    keyboardNavigation: parseBooleanCell(first.keyboardNavigation, true),
    shuffleQuestions: parseBooleanCell(first.shuffleQuestions, false),
    shuffleOptions: parseBooleanCell(first.shuffleOptions, false),
    allowReview: parseBooleanCell(first.allowReview, true),
  };

  const questions: ImportedQuestion[] = rows
    .map((row) => {
      const questionText = toRequiredTrimmedString(row.questionText);
      if (!questionText) return null;
      const correctAnswer = toRequiredTrimmedString(
        row.correctAnswer,
      ).toUpperCase();

      return {
        questionText,
        options: [
          toRequiredTrimmedString(row.optionA),
          toRequiredTrimmedString(row.optionB),
          toRequiredTrimmedString(row.optionC),
          toRequiredTrimmedString(row.optionD),
        ],
        correctAnswer: ["A", "B", "C", "D"].includes(correctAnswer)
          ? (correctAnswer as "A" | "B" | "C" | "D")
          : "A",
        marks:
          typeof row.marks === "number"
            ? row.marks
            : typeof row.marks === "string" && row.marks.trim().length > 0
              ? Number(row.marks)
              : undefined,
        section: toOptionalTrimmedString(row.section),
      };
    })
    .filter((question): question is ImportedQuestion => question !== null);

  return { exam, questions };
};

export default function ExaminerExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [myExams, setMyExams] = useState<Exam[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [isSubmittingExamId, setIsSubmittingExamId] = useState<string | null>(
    null,
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDuration, setEditDuration] = useState(120);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editAutoSubmit, setEditAutoSubmit] = useState(true);
  const [editEnableTts, setEditEnableTts] = useState(true);
  const [editSpeechRate, setEditSpeechRate] = useState<
    "slow" | "normal" | "fast"
  >("normal");
  const [editAutoRepeat, setEditAutoRepeat] = useState(false);
  const [editKeyboardNavigation, setEditKeyboardNavigation] = useState(true);
  const [editShuffleQuestions, setEditShuffleQuestions] = useState(false);
  const [editShuffleOptions, setEditShuffleOptions] = useState(false);
  const [editAllowReview, setEditAllowReview] = useState(true);

  if (!user || user.role !== "examiner") return <Navigate to="/login" />;

  const load = async () => {
    try {
      const exams = await getAllExamsApi();
      setMyExams(exams.filter((e) => e.createdBy === user._id));
    } catch (error) {
      console.error("Failed to load examiner exams", error);
      toast.error("Could not load your exams.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const examIdToEdit = searchParams.get("edit");
    if (!examIdToEdit || myExams.length === 0) return;

    const exam = myExams.find((entry) => entry._id === examIdToEdit);
    if (!exam) return;

    openEditDialog(exam);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("edit");
    setSearchParams(nextParams, { replace: true });
  }, [myExams, searchParams, setSearchParams]);

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-warning/10 text-warning",
    approved: "bg-info/10 text-info",
    rejected: "bg-destructive/10 text-destructive",
    published: "bg-success/10 text-success",
    completed: "bg-primary/10 text-primary",
  };

  const toDateTimeInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - timezoneOffsetMs)
      .toISOString()
      .slice(0, 16);
  };

  const toIsoOrUndefined = (value: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditDuration(exam.duration);
    setEditStartDate(toDateTimeInputValue(exam.startTime));
    setEditEndDate(toDateTimeInputValue(exam.endTime));
    setEditAutoSubmit(exam.autoSubmit ?? true);
    setEditEnableTts(exam.enableTTS ?? true);
    setEditSpeechRate(exam.speechRate ?? "normal");
    setEditAutoRepeat(exam.autoRepeat ?? false);
    setEditKeyboardNavigation(exam.keyboardNavigation ?? true);
    setEditShuffleQuestions(exam.shuffleQuestions ?? false);
    setEditShuffleOptions(exam.shuffleOptions ?? false);
    setEditAllowReview(exam.allowReview ?? true);
    setEditOpen(true);
  };

  const handleSubmitForApproval = async (examId: string) => {
    setIsSubmittingExamId(examId);
    try {
      await requestApprovalApi(examId);
      toast.success("Exam submitted for approval.");
      await load();
    } catch (error) {
      console.error("Failed to submit exam for approval", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit exam for approval.",
      );
    } finally {
      setIsSubmittingExamId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingExam) return;
    if (
      editTitle.trim().length < 3 ||
      !Number.isFinite(editDuration) ||
      editDuration < 1
    ) {
      toast.error("Please add a valid title and duration.");
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateExamApi(editingExam._id, {
        title: editTitle.trim(),
        duration: editDuration,
        startTime: toIsoOrUndefined(editStartDate),
        endTime: toIsoOrUndefined(editEndDate),
        autoSubmit: editAutoSubmit,
        enableTTS: editEnableTts,
        speechRate: editSpeechRate,
        autoRepeat: editAutoRepeat,
        keyboardNavigation: editKeyboardNavigation,
        shuffleQuestions: editShuffleQuestions,
        shuffleOptions: editShuffleOptions,
        allowReview: editAllowReview,
      });
      toast.success("Exam updated.");
      setEditOpen(false);
      setEditingExam(null);
      await load();
    } catch (error) {
      console.error("Failed to update exam", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update exam.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const downloadCsvTemplate = () => {
    const sheet = XLSX.utils.json_to_sheet(importTemplateRows, {
      header: templateColumns as string[],
    });
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exam-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV import template downloaded.");
  };

  const downloadExcelTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(importTemplateRows, {
      header: templateColumns as string[],
    });
    XLSX.utils.book_append_sheet(workbook, sheet, "ExamImportTemplate");
    const workbookArray = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([workbookArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exam-import-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel import template downloaded.");
  };

  const validateImportedExam = (payload: ImportedExam): string | null => {
    if (!payload.exam?.examTitle?.trim()) return "exam.examTitle is required.";
    if (!payload.exam?.subject?.trim()) return "exam.subject is required.";
    if (!Number.isFinite(payload.exam.duration) || payload.exam.duration < 1) {
      return "exam.duration must be a positive number.";
    }
    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return "questions must contain at least one question.";
    }

    for (let i = 0; i < payload.questions.length; i += 1) {
      const question = payload.questions[i];
      if (!question.questionText?.trim()) {
        return `questions[${i}].questionText is required.`;
      }
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        return `questions[${i}].options must contain exactly 4 options.`;
      }
      if (question.options.some((option) => !option?.trim())) {
        return `questions[${i}] has an empty option.`;
      }
      if (!["A", "B", "C", "D"].includes(question.correctAnswer)) {
        return `questions[${i}].correctAnswer must be one of A, B, C, D.`;
      }
    }

    return null;
  };

  const importExamFromFile = async (file?: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (
      !lowerName.endsWith(".csv") &&
      !lowerName.endsWith(".xlsx") &&
      !lowerName.endsWith(".xls")
    ) {
      toast.error(
        "Please upload a CSV or Excel file created from the template.",
      );
      return;
    }

    setIsImporting(true);
    try {
      const fileBuffer = await file.arrayBuffer();
      const workbook = lowerName.endsWith(".csv")
        ? XLSX.read(decodeCsvText(fileBuffer), { type: "string" })
        : XLSX.read(fileBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        toast.error("Uploaded file does not contain any sheet data.");
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        {
          defval: "",
        },
      );
      const payload = parseImportedExam(rows);
      const validationError = validateImportedExam(payload);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      const createdExam = await createExamApi({
        title: payload.exam.examTitle.trim(),
        titleAmharic: payload.exam.examTitleAmharic?.trim() || undefined,
        subject: payload.exam.subject.trim().toLowerCase(),
        grade: payload.exam.grade?.trim() || undefined,
        description: payload.exam.description?.trim() || undefined,
        descriptionAmharic:
          payload.exam.descriptionAmharic?.trim() || undefined,
        duration: payload.exam.duration,
        startTime: payload.exam.startDate || undefined,
        endTime: payload.exam.endDate || undefined,
        autoSubmit: payload.exam.autoSubmit ?? true,
        enableTTS: payload.exam.enableTTS ?? true,
        speechRate: payload.exam.speechRate ?? "normal",
        autoRepeat: payload.exam.autoRepeat ?? false,
        keyboardNavigation: payload.exam.keyboardNavigation ?? true,
        shuffleQuestions: payload.exam.shuffleQuestions ?? false,
        shuffleOptions: payload.exam.shuffleOptions ?? false,
        allowReview: payload.exam.allowReview ?? true,
      });

      await Promise.all(
        payload.questions.map((question) =>
          createQuestionApi({
            examId: createdExam.id,
            text: question.questionText.trim(),
            options: question.options.map((option) => option.trim()),
            correctAnswer: ["A", "B", "C", "D"].indexOf(question.correctAnswer),
            section:
              question.section?.trim().toLowerCase() ||
              payload.exam.subject.trim().toLowerCase(),
          }),
        ),
      );

      toast.success("Exam imported successfully with all questions.");
      await load();
      navigate(`/examiner/exams?edit=${createdExam.id}`);
    } catch (error) {
      console.error("Failed to import exam", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import exam.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">My Exams</h1>
          <p className="text-sm text-muted-foreground">
            {myExams.length} exams created
          </p>
        </div>
        <Button
          className="bg-gradient-primary"
          onClick={() => navigate("/examiner/exams/create")}
        >
          <Plus className="mr-2 h-4 w-4" /> Create Exam
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadCsvTemplate}>
            <Download className="mr-2 h-4 w-4" /> CSV Template
          </Button>
          <Button variant="outline" onClick={downloadExcelTemplate}>
            <Download className="mr-2 h-4 w-4" /> Excel Template
          </Button>
          <Label
            htmlFor="exam-import-file"
            className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import Exam"}
          </Label>
          <Input
            id="exam-import-file"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            disabled={isImporting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              void importExamFromFile(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
      <div className="grid gap-4">
        {myExams.map((exam) => (
          <Card
            key={exam._id}
            className="shadow-card hover:shadow-elevated transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{exam.title}</h3>
                    {exam.titleAm && (
                      <p className="text-sm text-muted-foreground">
                        {exam.titleAm}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        General
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {exam.duration} min
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge
                    className={`text-xs border-0 ${statusColors[exam.status]}`}
                  >
                    {exam.status.replace(/_/g, " ")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      navigate(`/examiner/questions?examId=${exam._id}`)
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(exam)}
                    disabled={exam.status === "completed"}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {exam.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => void handleSubmitForApproval(exam._id)}
                      disabled={isSubmittingExamId === exam._id}
                    >
                      <Send className="mr-1 h-3 w-3" />
                      {isSubmittingExamId === exam._id
                        ? "Submitting..."
                        : "Submit"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!isSavingEdit) setEditOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Input
                type="datetime-local"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Speech Rate</Label>
              <Select
                value={editSpeechRate}
                onValueChange={(value) =>
                  setEditSpeechRate(value as "slow" | "normal" | "fast")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editAutoSubmit"
                  checked={editAutoSubmit}
                  onCheckedChange={(checked) =>
                    setEditAutoSubmit(checked === true)
                  }
                />
                <Label htmlFor="editAutoSubmit">Auto-submit on timeout</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editEnableTts"
                  checked={editEnableTts}
                  onCheckedChange={(checked) =>
                    setEditEnableTts(checked === true)
                  }
                />
                <Label htmlFor="editEnableTts">Enable TTS</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editAutoRepeat"
                  checked={editAutoRepeat}
                  onCheckedChange={(checked) =>
                    setEditAutoRepeat(checked === true)
                  }
                />
                <Label htmlFor="editAutoRepeat">Auto-repeat prompts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editKeyboardNavigation"
                  checked={editKeyboardNavigation}
                  onCheckedChange={(checked) =>
                    setEditKeyboardNavigation(checked === true)
                  }
                />
                <Label htmlFor="editKeyboardNavigation">
                  Keyboard navigation
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editShuffleQuestions"
                  checked={editShuffleQuestions}
                  onCheckedChange={(checked) =>
                    setEditShuffleQuestions(checked === true)
                  }
                />
                <Label htmlFor="editShuffleQuestions">Shuffle questions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editShuffleOptions"
                  checked={editShuffleOptions}
                  onCheckedChange={(checked) =>
                    setEditShuffleOptions(checked === true)
                  }
                />
                <Label htmlFor="editShuffleOptions">Shuffle options</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editAllowReview"
                  checked={editAllowReview}
                  onCheckedChange={(checked) =>
                    setEditAllowReview(checked === true)
                  }
                />
                <Label htmlFor="editAllowReview">Allow review</Label>
              </div>
            </div>
            <Button
              className="bg-gradient-primary"
              onClick={() => void handleSaveEdit()}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
