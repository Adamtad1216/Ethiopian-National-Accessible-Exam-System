import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Activity } from "lucide-react";
import type { Exam } from "@/types";
import { toast } from "sonner";
import type { ExamParticipantResultApi } from "@/services/api";
import ParticipantAnswerCard from "@/components/examiner/ParticipantAnswerCard";

export default function ExaminerMonitor() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedCountByExam, setCompletedCountByExam] = useState<
    Record<string, number>
  >({});
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [examDetails, setExamDetails] =
    useState<ExamParticipantResultApi | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  if (!user || user.role !== "examiner") return <Navigate to="/login" />;

  useEffect(() => {
    const load = async () => {
      try {
        const [allExams, allResults] = await Promise.all([
          getAllExamsApi(),
          getAllResultsApi(),
        ]);
        const myExams = allExams.filter((exam) => exam.createdBy === user._id);
        setExams(myExams);

        const counts = allResults.reduce<Record<string, number>>(
          (acc, result) => {
            acc[result.examId] = (acc[result.examId] ?? 0) + 1;
            return acc;
          },
          {},
        );
        setCompletedCountByExam(counts);
      } catch (error) {
        console.error("Failed to load monitor exams", error);
        toast.error("Could not load monitor data.");
      }
    };

    void load();
  }, [user._id]);

  const activeExams = useMemo(
    () =>
      exams.filter((exam) => ["published", "completed"].includes(exam.status)),
    [exams],
  );

  useEffect(() => {
    if (selectedExamId === "all") {
      setExamDetails(null);
      return;
    }

    const loadDetails = async () => {
      try {
        setIsLoadingDetails(true);
        const details = await getExamParticipantResultsApi(selectedExamId);
        setExamDetails(details);
      } catch (error) {
        console.error("Failed to load participant details", error);
        toast.error("Could not load participant details.");
        setExamDetails(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    void loadDetails();
  }, [selectedExamId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Live Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Exam progress, student answers, and score insights
        </p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Select exam</span>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-[360px]">
                <SelectValue placeholder="All monitored exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All monitored exams</SelectItem>
                {activeExams.map((exam) => (
                  <SelectItem key={exam._id} value={exam._id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {activeExams.length === 0 && (
        <Card className="shadow-card border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No published exams to monitor right now.
          </CardContent>
        </Card>
      )}

      {(selectedExamId === "all"
        ? activeExams
        : activeExams.filter((exam) => exam._id === selectedExamId)
      ).map((exam) => {
        const completedCount = completedCountByExam[exam._id] ?? 0;
        const detailsForExam =
          examDetails && examDetails.exam.id === exam._id ? examDetails : null;

        return (
          <Card key={exam._id} className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> {exam.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3 mb-4">
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <p className="text-xl font-bold text-success">
                    {completedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-center">
                  <p className="text-xl font-bold text-primary">
                    {detailsForExam?.participants.length ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3 text-center">
                  <p className="text-xl font-bold text-destructive">
                    {detailsForExam
                      ? detailsForExam.participants.filter((participant) =>
                          participant.answers.some(
                            (answer) => answer.isCorrect === false,
                          ),
                        ).length
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Disconnected</p>
                </div>
              </div>

              <div className="space-y-2">
                {isLoadingDetails && selectedExamId !== "all" && (
                  <p className="text-sm text-muted-foreground">
                    Loading participant data...
                  </p>
                )}

                {detailsForExam?.participants.map((participant) => {
                  return (
                    <ParticipantAnswerCard
                      key={participant.student.id}
                      participant={participant}
                    />
                  );
                })}

                {!isLoadingDetails &&
                  selectedExamId !== "all" &&
                  detailsForExam &&
                  detailsForExam.participants.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No participant answers found yet for this exam.
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
