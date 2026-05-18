import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllExamsApi,
  getAllResultsApi,
  getExamParticipantResultsApi,
} from "@/features/examiner/services/examinerService";
import { Download, FileText } from "lucide-react";
import type { Exam, ExamResult } from "@/types";
import { toast } from "sonner";
import type { ExamParticipantResultApi } from "@/services/api";

export default function ExaminerResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [participantDetails, setParticipantDetails] =
    useState<ExamParticipantResultApi | null>(null);
  const [isLoadingParticipantDetails, setIsLoadingParticipantDetails] =
    useState(false);
  if (!user || user.role !== "examiner") return <Navigate to="/login" />;

  useEffect(() => {
    const load = async () => {
      try {
        const [examsRes, resultsRes] = await Promise.all([
          getAllExamsApi(),
          getAllResultsApi(),
        ]);
        const myExams = examsRes.filter((exam) => exam.createdBy === user._id);
        const myExamIds = new Set(myExams.map((exam) => exam._id));
        setExams(myExams);
        setResults(resultsRes.filter((result) => myExamIds.has(result.examId)));
      } catch (error) {
        console.error("Failed to load results", error);
        toast.error("Failed to load results.");
      }
    };

    void load();
  }, [user._id]);

  useEffect(() => {
    if (selectedExamId === "all") {
      setParticipantDetails(null);
      return;
    }

    const loadParticipantDetails = async () => {
      try {
        setIsLoadingParticipantDetails(true);
        const details = await getExamParticipantResultsApi(selectedExamId);
        setParticipantDetails(details);
      } catch (error) {
        console.error("Failed to load participant details", error);
        toast.error("Failed to load participant-level answers.");
        setParticipantDetails(null);
      } finally {
        setIsLoadingParticipantDetails(false);
      }
    };

    void loadParticipantDetails();
  }, [selectedExamId]);

  const filteredResults = useMemo(() => {
    if (selectedExamId === "all") return results;
    return results.filter((result) => result.examId === selectedExamId);
  }, [results, selectedExamId]);

  const averageScore = useMemo(() => {
    if (filteredResults.length === 0) return 0;
    return Math.round(
      filteredResults.reduce((acc, r) => acc + r.percentage, 0) /
        filteredResults.length,
    );
  }, [filteredResults]);

  const downloadCsv = () => {
    if (filteredResults.length === 0) {
      toast.info("No results to export.");
      return;
    }

    const rows = filteredResults.map((result) => {
      const exam = exams.find((entry) => entry._id === result.examId);
      return {
        examTitle: exam?.title ?? result.examId,
        studentId: result.studentName || result.studentId,
        percentage: result.percentage,
        grade: result.grade,
        totalCorrect: result.totalCorrect,
        totalQuestions: result.totalQuestions,
      };
    });

    const headers = [
      "Exam Title",
      "Student ID",
      "Score (%)",
      "Grade",
      "Correct Answers",
      "Total Questions",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.examTitle,
          row.studentId,
          row.percentage,
          row.grade,
          row.totalCorrect,
          row.totalQuestions,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `examiner-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  const exportPdfView = () => {
    if (filteredResults.length === 0) {
      toast.info("No results to export.");
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">
            Results & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            View and export exam results
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={exportPdfView}>
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Filter by exam</span>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="All my exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All my exams</SelectItem>
                {exams.map((exam) => (
                  <SelectItem key={exam._id} value={exam._id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold font-display text-primary">
              {filteredResults.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Results Published
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold font-display text-success">
              {averageScore}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Average Score</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold font-display text-info">
              {averageScore >= 70 ? "A" : averageScore >= 50 ? "B" : "C"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Most Common Grade
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-display">
            Published Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResults.map((result) => {
            const exam = exams.find((e) => e._id === result.examId);
            return (
              <div key={result._id} className="p-4 rounded-xl border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{exam?.title || "Exam"}</h3>
                    <p className="text-sm text-muted-foreground">
                      Student: {result.studentName || result.studentId}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold font-display text-primary">
                        {result.percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Grade: {result.grade}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/examiner/results/${result.studentId}/${result.examId}`)}
                      className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 font-semibold text-xs dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:border-emerald-800/50 dark:text-emerald-400"
                    >
                      Review Result
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {result.sectionScores.map((s) => (
                    <div key={s.sectionId} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24">
                        {s.sectionName}
                      </span>
                      <Progress
                        value={s.percentage}
                        className="flex-1 h-2 rounded-full"
                      />
                      <span className="text-xs font-medium w-12 text-right">
                        {s.correct}/{s.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filteredResults.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No results available for the selected exam.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-display">
            Participant Answer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedExamId === "all" && (
            <p className="text-sm text-muted-foreground">
              Select a specific exam to view each participant's answers and
              correctness.
            </p>
          )}

          {selectedExamId !== "all" && isLoadingParticipantDetails && (
            <p className="text-sm text-muted-foreground">
              Loading participant details...
            </p>
          )}

          {selectedExamId !== "all" &&
            !isLoadingParticipantDetails &&
            participantDetails &&
            participantDetails.participants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No participant submissions found for this exam yet.
              </p>
            )}

          {selectedExamId !== "all" &&
            !isLoadingParticipantDetails &&
            participantDetails?.participants.map((participant) => {
              const participantName = `${participant.student.firstName} ${participant.student.lastName}`.trim();
              return (
                <div key={participant.student.id} className="rounded-xl border p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">
                        {participantName || participant.student.email}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {participant.student.email}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-primary">
                      Score: {participant.score}%
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {participant.answers.map((answer) => {
                      const selectedText =
                        typeof answer.selectedOption === "number"
                          ? answer.options[answer.selectedOption] ?? "Invalid answer"
                          : "No answer";
                      const correctText =
                        answer.options[answer.correctAnswer] ?? "Invalid answer";

                      return (
                        <div
                          key={answer.questionId}
                          className={`rounded-lg border p-3 ${
                            answer.isCorrect === true
                              ? "border-success/40 bg-success/10"
                              : answer.isCorrect === false
                                ? "border-destructive/40 bg-destructive/10"
                                : "border-muted bg-muted/40"
                          }`}
                        >
                          <p className="text-sm font-medium">
                            Q{answer.questionNumber}. {answer.questionText}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="font-medium">Selected:</span>{" "}
                            {selectedText}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="font-medium">Correct:</span>{" "}
                            {correctText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
