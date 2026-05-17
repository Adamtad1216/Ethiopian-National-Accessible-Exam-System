import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  CheckCircle,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  getAllExamsApi,
  getAllResultsApi,
} from "@/features/examiner/services/examinerService";
import { motion } from "framer-motion";
import type { Exam, ExamResult } from "@/types";
import { toast } from "sonner";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function ExaminerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  if (!user || user.role !== "examiner") return <Navigate to="/login" />;

  useEffect(() => {
    const load = async () => {
      try {
        const [examsRes, resultsRes] = await Promise.all([
          getAllExamsApi(),
          getAllResultsApi(),
        ]);
        setExams(examsRes);
        setResults(resultsRes);
      } catch (error) {
        console.error("Failed to load examiner dashboard", error);
        toast.error("Failed to load dashboard data.");
      }
    };

    void load();
  }, []);

  const myExams = useMemo(
    () => exams.filter((e) => e.createdBy === user._id),
    [exams, user._id],
  );
  const myExamIds = useMemo(() => new Set(myExams.map((exam) => exam._id)), [myExams]);
  const myResults = useMemo(
    () => results.filter((result) => myExamIds.has(result.examId)),
    [myExamIds, results],
  );
  const avgScore = myResults.length
    ? Math.round(
        myResults.reduce((acc, r) => acc + r.percentage, 0) / myResults.length,
      )
    : 0;

  const statCards = [
    {
      label: "My Exams",
      value: myExams.length,
      icon: FileText,
      color: "text-primary",
    },
    {
      label: "Pending Approval",
      value: myExams.filter((e) => e.status === "pending").length,
      icon: Clock,
      color: "text-warning",
    },
    {
      label: "Published",
      value: myExams.filter((e) => e.status === "published").length,
      icon: CheckCircle,
      color: "text-success",
    },
    {
      label: "Avg Score",
      value: `${avgScore}%`,
      icon: TrendingUp,
      color: "text-info",
    },
  ];

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-warning/10 text-warning",
    approved: "bg-info/10 text-info",
    rejected: "bg-destructive/10 text-destructive",
    published: "bg-success/10 text-success",
    completed: "bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">
            Examiner Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome, {user.firstName}. Manage your exams and questions.
          </p>
        </div>
        <Button
          className="bg-gradient-primary"
          onClick={() => navigate("/examiner/exams/create")}
        >
          <Plus className="mr-2 h-4 w-4" /> New Exam
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            {...fadeIn}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {s.label}
                    </p>
                    <p className="text-3xl font-bold font-display mt-1">
                      {s.value}
                    </p>
                  </div>
                  <div
                    className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-display">My Exams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myExams.map((exam) => (
              <div
                key={exam._id}
                className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{exam.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {exam.subject} • {exam.totalQuestions} questions •{" "}
                      {exam.duration} min
                    </p>
                  </div>
                </div>
                <Badge
                  className={`text-xs border-0 ${statusColors[exam.status]}`}
                >
                  {exam.status.replace(/_/g, " ")}
                </Badge>
              </div>
            ))}
            {myExams.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No exams created yet. Create your first exam to begin the workflow.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
