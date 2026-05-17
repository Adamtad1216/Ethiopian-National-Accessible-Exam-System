import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import QuestionBlock, {
  type Option,
  type Question,
} from "@/components/examiner/QuestionBlock";
import PreviewModal from "@/components/examiner/PreviewModal";
import { Eye, ListTree, Plus, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createExamApi,
  createQuestionApi,
} from "@/features/examiner/services/examinerService";

function createQuestionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyOptions(): Option[] {
  return [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ];
}

function createEmptyQuestion(subject = ""): Question {
  return {
    id: createQuestionId(),
    subject,
    questionText: "",
    options: createEmptyOptions(),
    correctAnswer: "",
    marks: 1,
    accessibilityNote: "",
  };
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

type ExamInfo = {
  examTitle: string;
  examTitleAmharic: string;
  subject: string;
  grade: string;
  description: string;
  descriptionAmharic: string;
  duration: number;
  startDate: string;
  endDate: string;
  autoSubmit: boolean;
  enableTTS: boolean;
  speechRate: "slow" | "normal" | "fast";
  autoRepeat: boolean;
  keyboardNavigation: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowReview: boolean;
};

const subjectOptions = [
  { value: "mathematics", label: "Mathematics" },
  { value: "english", label: "English" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "biology", label: "Biology" },
  { value: "civics", label: "Civics" },
];

export default function CreateExamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [examInfo, setExamInfo] = useState<ExamInfo>({
    examTitle: "",
    examTitleAmharic: "",
    subject: "",
    grade: "",
    description: "",
    descriptionAmharic: "",
    duration: 120,
    startDate: "",
    endDate: "",
    autoSubmit: true,
    enableTTS: true,
    speechRate: "normal",
    autoRepeat: false,
    keyboardNavigation: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    allowReview: true,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [draftQuestion, setDraftQuestion] = useState<Question>(
    createEmptyQuestion(),
  );
  const [isSaving, setIsSaving] = useState(false);

  const subjectLabelByValue = useMemo(
    () =>
      Object.fromEntries(
        subjectOptions.map((subjectOption) => [
          subjectOption.value,
          subjectOption.label,
        ]),
      ) as Record<string, string>,
    [],
  );

  const groupedQuestions = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ question: Question; index: number }>
    >();
    questions.forEach((question, index) => {
      const key = question.subject || examInfo.subject || "unassigned";
      const current = groups.get(key) ?? [];
      current.push({ question, index });
      groups.set(key, current);
    });
    return Array.from(groups.entries());
  }, [examInfo.subject, questions]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!examInfo.examTitle.trim()) {
      errors.push("Exam title is required.");
    }

    if (!examInfo.subject) {
      errors.push("Subject is required.");
    }

    if (questions.length === 0) {
      errors.push("At least 1 question is required.");
    }

    questions.forEach((question, index) => {
      const questionNumber = index + 1;
      if (!question.questionText.trim()) {
        errors.push(`Question ${questionNumber}: question text is required.`);
      }
      if (question.options.some((option) => !option.text.trim())) {
        errors.push(
          `Question ${questionNumber}: all 4 options must be filled.`,
        );
      }
      if (!question.correctAnswer) {
        errors.push(`Question ${questionNumber}: select the correct answer.`);
      }
    });

    return errors;
  }, [examInfo.examTitle, examInfo.subject, questions]);

  const openAddQuestionModal = (subjectFromTrigger?: string) => {
    const subject = subjectFromTrigger || examInfo.subject || "mathematics";
    setDraftQuestion(createEmptyQuestion(subject));
    setEditingQuestionId(null);
    setIsQuestionModalOpen(true);
  };

  const openEditQuestionModal = (questionId: string) => {
    const found = questions.find((question) => question.id === questionId);
    if (!found) return;

    setDraftQuestion({
      ...found,
      options: found.options.map((option) => ({ ...option })),
    });
    setEditingQuestionId(questionId);
    setIsQuestionModalOpen(true);
  };

  const updateQuestion = (id: string, updatedData: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, ...updatedData } : question,
      ),
    );
  };

  const deleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((question) => question.id !== id));
    if (activeQuestionId === id) {
      setActiveQuestionId(null);
    }
  };

  const duplicateQuestion = (id: string) => {
    setQuestions((prev) => {
      const index = prev.findIndex((question) => question.id === id);
      if (index < 0) return prev;

      const source = prev[index];
      const copy: Question = {
        ...source,
        id: createQuestionId(),
        options: source.options.map((option) => ({ ...option })),
      };

      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const saveDraftQuestion = () => {
    if (!draftQuestion.questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }
    if (draftQuestion.options.some((option) => !option.text.trim())) {
      toast.error("Please fill all four options.");
      return;
    }
    if (!draftQuestion.correctAnswer) {
      toast.error("Select the correct answer.");
      return;
    }

    if (editingQuestionId) {
      updateQuestion(editingQuestionId, draftQuestion);
      setActiveQuestionId(editingQuestionId);
      toast.success("Question updated.");
    } else {
      setQuestions((prev) => [...prev, draftQuestion]);
      setActiveQuestionId(draftQuestion.id);
      toast.success("Question added.");
    }

    setIsQuestionModalOpen(false);
    setEditingQuestionId(null);
    setDraftQuestion(createEmptyQuestion(examInfo.subject));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    try {
      setIsSaving(true);

      const exam = await createExamApi({
        title: examInfo.examTitle.trim(),
        titleAmharic: examInfo.examTitleAmharic.trim() || undefined,
        subject: examInfo.subject,
        grade: examInfo.grade || undefined,
        description: examInfo.description.trim() || undefined,
        descriptionAmharic: examInfo.descriptionAmharic.trim() || undefined,
        duration: examInfo.duration,
        startTime: toIsoOrUndefined(examInfo.startDate),
        endTime: toIsoOrUndefined(examInfo.endDate),
        autoSubmit: examInfo.autoSubmit,
        enableTTS: examInfo.enableTTS,
        speechRate: examInfo.speechRate,
        autoRepeat: examInfo.autoRepeat,
        keyboardNavigation: examInfo.keyboardNavigation,
        shuffleQuestions: examInfo.shuffleQuestions,
        shuffleOptions: examInfo.shuffleOptions,
        allowReview: examInfo.allowReview,
      });

      await Promise.all(
        questions.map((question) => {
          const correctAnswerIndex = question.options.findIndex(
            (option) => option.label === question.correctAnswer,
          );

          return createQuestionApi({
            examId: exam.id,
            text: question.questionText.trim(),
            options: question.options.map((option) => option.text.trim()),
            correctAnswer: correctAnswerIndex,
            section: question.subject || examInfo.subject,
          });
        }),
      );

      toast.success("Exam saved as draft in database.");
      navigate(`/examiner/exams?edit=${exam.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save exam draft.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || user.role !== "examiner") {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Create Exam</h1>
            <p className="text-sm text-muted-foreground">
              Build an accessible exam with smooth, subject-based question
              authoring.
            </p>
          </div>
        </div>

        <Card className="shadow-card border-primary/20 bg-gradient-to-br from-background via-background to-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="examTitle">Exam Title</Label>
              <Input
                id="examTitle"
                value={examInfo.examTitle}
                onChange={(e) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    examTitle: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="examTitleAmharic">Title (Amharic)</Label>
              <Input
                id="examTitleAmharic"
                value={examInfo.examTitleAmharic}
                onChange={(e) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    examTitleAmharic: e.target.value,
                  }))
                }
                placeholder="e.g., የክፍል 12 ፈተና"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={examInfo.subject}
                onValueChange={(value) => {
                  setExamInfo((prev) => ({ ...prev, subject: value }));
                }}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((subjectOption) => (
                    <SelectItem
                      key={subjectOption.value}
                      value={subjectOption.value}
                    >
                      {subjectOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a subject, then use Add Question from the sidebar.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select
                value={examInfo.grade}
                onValueChange={(value) =>
                  setExamInfo((prev) => ({ ...prev, grade: value }))
                }
              >
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="10">Grade 10</SelectItem>
                  <SelectItem value="11">Grade 11</SelectItem>
                  <SelectItem value="12">Grade 12</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={examInfo.description}
                onChange={(e) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe exam purpose and coverage (optional)"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descriptionAmharic">Description (Amharic)</Label>
              <Textarea
                id="descriptionAmharic"
                value={examInfo.descriptionAmharic}
                onChange={(e) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    descriptionAmharic: e.target.value,
                  }))
                }
                placeholder="የፈተና ማብራሪያ (አማራጭ)"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Timing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={examInfo.duration}
                onChange={(e) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    duration:
                      Number(e.target.value) > 0 ? Number(e.target.value) : 1,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date & Time</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={examInfo.startDate}
                onChange={(e) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date & Time</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={examInfo.endDate}
                onChange={(e) =>
                  setExamInfo((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoSubmit"
                checked={examInfo.autoSubmit}
                onCheckedChange={(checked) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    autoSubmit: checked === true,
                  }))
                }
              />
              <Label htmlFor="autoSubmit">Auto-submit when time expires</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">
              Accessibility Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="enableTTS"
                checked={examInfo.enableTTS}
                onCheckedChange={(checked) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    enableTTS: checked === true,
                  }))
                }
              />
              <Label htmlFor="enableTTS">Enable TTS</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="speechRate">Speech Rate</Label>
              <Select
                value={examInfo.speechRate}
                onValueChange={(value: "slow" | "normal" | "fast") =>
                  setExamInfo((prev) => ({ ...prev, speechRate: value }))
                }
              >
                <SelectTrigger id="speechRate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoRepeat"
                checked={examInfo.autoRepeat}
                onCheckedChange={(checked) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    autoRepeat: checked === true,
                  }))
                }
              />
              <Label htmlFor="autoRepeat">Auto-repeat question prompts</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="keyboardNavigation"
                checked={examInfo.keyboardNavigation}
                onCheckedChange={(checked) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    keyboardNavigation: checked === true,
                  }))
                }
              />
              <Label htmlFor="keyboardNavigation">
                Keyboard navigation enabled
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Exam Rules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="shuffleQuestions"
                checked={examInfo.shuffleQuestions}
                onCheckedChange={(checked) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    shuffleQuestions: checked === true,
                  }))
                }
              />
              <Label htmlFor="shuffleQuestions">Shuffle questions</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="shuffleOptions"
                checked={examInfo.shuffleOptions}
                onCheckedChange={(checked) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    shuffleOptions: checked === true,
                  }))
                }
              />
              <Label htmlFor="shuffleOptions">Shuffle options</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allowReview"
                checked={examInfo.allowReview}
                onCheckedChange={(checked) =>
                  setExamInfo((prev) => ({
                    ...prev,
                    allowReview: checked === true,
                  }))
                }
              />
              <Label htmlFor="allowReview">Allow review before submit</Label>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="shadow-card h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <ListTree className="h-4 w-4 text-primary" /> Questions Sidebar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                className="w-full"
                aria-label="Add a new question"
                onClick={() => openAddQuestionModal()}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Question
              </Button>

              {groupedQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Questions will appear grouped by subject.
                </p>
              )}

              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {groupedQuestions.map(([subjectKey, entries]) => (
                  <section key={subjectKey} className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      {subjectLabelByValue[subjectKey] ?? subjectKey}
                    </h3>
                    <div className="space-y-2">
                      {entries.map(({ question, index }) => (
                        <button
                          key={question.id}
                          type="button"
                          className={`w-full rounded-md border p-3 text-left transition-colors ${
                            activeQuestionId === question.id
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted/40"
                          }`}
                          onClick={() => {
                            setActiveQuestionId(question.id);
                            openEditQuestionModal(question.id);
                          }}
                          aria-label={`Open question ${index + 1} for editing`}
                        >
                          <p className="text-sm font-medium">
                            Question {index + 1}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {question.questionText || "No question text yet"}
                          </p>
                          <p className="text-xs mt-1 text-primary">
                            Answer: {question.correctAnswer || "Not selected"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">
                Question Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add questions from the sidebar or by selecting a subject.
                </p>
              )}

              {questions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {subjectLabelByValue[question.subject || ""] ||
                      question.subject ||
                      "Unassigned"}
                  </p>
                  <QuestionBlock
                    question={question}
                    questionNumber={index + 1}
                    onUpdate={updateQuestion}
                    onDelete={deleteQuestion}
                    onDuplicate={duplicateQuestion}
                    subjectOptions={subjectOptions}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {validationErrors.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Validation Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-6 text-sm text-destructive">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card border-primary/20 bg-gradient-to-r from-background to-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label="Preview exam"
                onClick={() => setIsPreviewOpen(true)}
              >
                <Eye className="mr-2 h-4 w-4" /> Preview Exam
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label="Back to examiner exams"
                disabled={isSaving}
                onClick={() => navigate("/examiner/exams")}
              >
                Back to Exams
              </Button>
              <Button type="submit" aria-label="Save exam" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Exam"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-right">
              Save creates your draft package. Submit for approval is done from
              My Exams.
            </p>
          </CardContent>
        </Card>
      </form>

      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
          <div className="bg-gradient-to-r from-primary via-primary to-primary/80 px-6 py-5 text-primary-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">
                {editingQuestionId ? "Edit Question" : "Add Question"}
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/85">
                Fast authoring modal for high-volume question entry.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6">
            <QuestionBlock
              question={draftQuestion}
              questionNumber={1}
              onUpdate={(_id, updatedData) =>
                setDraftQuestion((prev) => ({ ...prev, ...updatedData }))
              }
              onDelete={() => undefined}
              onDuplicate={() => undefined}
              showActions={false}
              subjectOptions={subjectOptions}
            />

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuestionModalOpen(false)}
                aria-label="Cancel question editing"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveDraftQuestion}
                aria-label="Save question"
              >
                Save Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        examTitle={examInfo.examTitle}
        questions={questions}
        enableTTS={examInfo.enableTTS}
        speechRate={examInfo.speechRate}
        autoRepeat={examInfo.autoRepeat}
      />
    </>
  );
}
