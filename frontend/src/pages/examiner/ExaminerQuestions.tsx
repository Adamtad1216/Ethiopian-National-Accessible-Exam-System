import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createQuestionApi,
  getAllExamsApi,
  getExamQuestionsApi,
} from "@/features/examiner/services/examinerService";
import { BookOpen, Plus, Upload } from "lucide-react";
import type { Exam, Question } from "@/types";
import { toast } from "sonner";

export default function ExaminerQuestions() {
  const { user } = useAuth();
  if (!user || user.role !== "examiner") return <Navigate to="/login" />;
  const [searchParams, setSearchParams] = useSearchParams();

  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examId, setExamId] = useState("");
  const [text, setText] = useState("");
  const [section, setSection] = useState("General");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correct, setCorrect] = useState("A");
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const load = async () => {
    try {
      const allExams = await getAllExamsApi();
      const myExams = allExams.filter((exam) => exam.createdBy === user._id);
      setExams(myExams);

      if (myExams.length > 0) {
        const examIdFromQuery = searchParams.get("examId");
        const existsInMyExams = myExams.some((exam) => exam._id === examIdFromQuery);
        const targetExamId =
          existsInMyExams && examIdFromQuery ? examIdFromQuery : examId || myExams[0]._id;

        if (targetExamId !== examId) {
          setExamId(targetExamId);
        }

        if (searchParams.get("examId") !== targetExamId) {
          const next = new URLSearchParams(searchParams);
          next.set("examId", targetExamId);
          setSearchParams(next, { replace: true });
        }

        setQuestions(await getExamQuestionsApi(targetExamId));
      } else {
        setExamId("");
        setQuestions([]);
      }
    } catch (error) {
      console.error("Failed to load questions", error);
      toast.error("Failed to load question bank.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!examId) return;
    void getExamQuestionsApi(examId)
      .then(setQuestions)
      .catch((error) => {
        console.error("Failed to load exam questions", error);
      });
  }, [examId]);

  const canAddQuestion = useMemo(() => {
    const options = [optionA, optionB, optionC, optionD].filter(
      (option) => option.trim().length > 0,
    );
    const correctAnswer = ["A", "B", "C", "D"].indexOf(correct);
    return examId.length > 0 && text.trim().length >= 2 && options.length >= 2 && correctAnswer < options.length;
  }, [correct, examId, optionA, optionB, optionC, optionD, text]);

  const resetQuestionForm = () => {
    setText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrect("A");
  };

  const handleAddQuestion = async () => {
    if (!canAddQuestion) {
      toast.error("Please provide question text, at least 2 options, and a valid correct answer.");
      return;
    }
    if (!examId) return;

    setIsAddingQuestion(true);
    try {
      const options = [optionA, optionB, optionC, optionD]
        .map((option) => option.trim())
        .filter(Boolean);
      const correctAnswer = ["A", "B", "C", "D"].indexOf(correct);
      await createQuestionApi({
        examId,
        text: text.trim(),
        options,
        correctAnswer,
        section,
      });
      resetQuestionForm();
      setAddDialogOpen(false);
      setQuestions(await getExamQuestionsApi(examId));
      toast.success("Question added.");
    } catch (error) {
      console.error("Failed to create question", error);
      toast.error(error instanceof Error ? error.message : "Failed to add question.");
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const examsMap = useMemo(
    () => Object.fromEntries(exams.map((e) => [e._id, e])),
    [exams],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Question Bank</h1>
          <p className="text-sm text-muted-foreground">
            {questions.length} questions across selected exam
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.info("Bulk import for examiner questions will be added soon.")}
          >
            <Upload className="mr-2 h-4 w-4" /> Bulk Import
          </Button>
          <Dialog
            open={addDialogOpen}
            onOpenChange={(open) => {
              setAddDialogOpen(open);
              if (!open && !isAddingQuestion) {
                resetQuestionForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" disabled={exams.length === 0}>
                <Plus className="mr-2 h-4 w-4" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Exam</Label>
                  <Select
                    value={examId}
                    onValueChange={(nextExamId) => {
                      setExamId(nextExamId);
                      const next = new URLSearchParams(searchParams);
                      next.set("examId", nextExamId);
                      setSearchParams(next, { replace: true });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((e) => (
                        <SelectItem key={e._id} value={e._id}>
                          {e.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Question Text (English)</Label>
                  <Input
                    placeholder="Enter question..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Question Text (Amharic)</Label>
                  <Input placeholder="Optional for now" disabled />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Option A</Label>
                    <Input
                      placeholder="Option A"
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Option B</Label>
                    <Input
                      placeholder="Option B"
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Option C</Label>
                    <Input
                      placeholder="Option C"
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Option D</Label>
                    <Input
                      placeholder="Option D"
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Select value={correct} onValueChange={setCorrect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="bg-gradient-primary"
                  onClick={() => void handleAddQuestion()}
                  disabled={isAddingQuestion || !canAddQuestion}
                >
                  {isAddingQuestion ? "Adding..." : "Add Question"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {exams.length === 0 && (
        <Card className="shadow-card border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            You do not have any exams yet. Create an exam first from the Exams page.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {questions.slice(0, 12).map((q) => (
          <Card key={q._id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                    {q.questionNumber}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{q.text}</p>
                    {q.textAm && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.textAm}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {q.options.map((o) => (
                        <Badge
                          key={o._id}
                          variant={
                            o._id === q.correctOption ? "default" : "outline"
                          }
                          className="text-xs"
                        >
                          {o.label}: {o.text}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {examsMap[q.examId]?.title || q.examId}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs capitalize shrink-0"
                >
                  {q.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
