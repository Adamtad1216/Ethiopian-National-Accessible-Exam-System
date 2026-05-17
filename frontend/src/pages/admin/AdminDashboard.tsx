import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  CheckCircle,
  Shield,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  approveExamApi,
  getAllExamsApi,
  getAuditLogsApi,
  publishExamApi,
  getUsersApi,
} from "@/features/admin/services/adminService";
import { motion } from "framer-motion";
import { formatAuditActorName, formatAuditDetails } from "@/lib/auditFormatter";
import type { Exam, User } from "@/types";
import { toast } from "sonner";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<
    Array<{
      _id: string;
      userName: string;
      action: string;
      details: string | Record<string, unknown>;
      timestamp: string;
    }>
  >([]);
  const [isProcessingExamId, setIsProcessingExamId] = useState<string | null>(
    null,
  );
  const [rejectedExamIds, setRejectedExamIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [examsRes, usersRes, logsRes] = await Promise.all([
          getAllExamsApi(),
          getUsersApi(),
          getAuditLogsApi(),
        ]);
        setExams(examsRes);
        setUsers(usersRes);
        setLogs(logsRes);
      } catch (error) {
        console.error("Failed to load admin dashboard", error);
      }
    };

    void load();
  }, []);

  const pendingExams = useMemo(
    () =>
      exams.filter(
        (e) => e.status === "pending" && !rejectedExamIds.includes(e._id),
      ),
    [exams, rejectedExamIds],
  );
  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);
  const stats = useMemo(
    () => ({
      totalStudents: users.filter((u) => u.role === "student").length,
      activeExams: exams.filter((e) => e.status === "published").length,
      pendingApprovals: pendingExams.length,
      totalQuestions: exams.reduce(
        (total, exam) => total + (exam.totalQuestions || 0),
        0,
      ),
    }),
    [users, exams, pendingExams],
  );

  const handleApprove = async (exam: Exam) => {
    setIsProcessingExamId(exam._id);
    try {
      await approveExamApi(exam._id);
      await publishExamApi(exam._id);
      setExams((prev) =>
        prev.map((item) =>
          item._id === exam._id ? { ...item, status: "published" } : item,
        ),
      );
      toast.success(`${exam.title} has been approved and published.`);
    } catch (error) {
      console.error("Failed to approve exam", error);
      toast.error("Failed to approve this exam. Please try again.");
    } finally {
      setIsProcessingExamId(null);
    }
  };

  const handleReject = (exam: Exam) => {
    setRejectedExamIds((prev) =>
      prev.includes(exam._id) ? prev : [...prev, exam._id],
    );
    toast.success(`${exam.title} removed from pending approvals.`);
  };

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Active Exams",
      value: stats.activeExams,
      icon: FileText,
      color: "text-info",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: CheckCircle,
      color: "text-warning",
    },
    {
      label: "Total Questions",
      value: stats.totalQuestions,
      icon: BarChart3,
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6" role="main" aria-label="Admin Dashboard">
      <div>
        <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {user.firstName}. Here's your system overview.
        </p>
      </div>

      {/* Stats Grid */}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Pending
                Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No pending approvals
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingExams.map((exam) => (
                    <div
                      key={exam._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.duration} minutes
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-success border-success/30 hover:bg-success/10"
                          onClick={() => void handleApprove(exam)}
                          disabled={isProcessingExamId === exam._id}
                        >
                          {isProcessingExamId === exam._id
                            ? "Approving..."
                            : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleReject(exam)}
                          disabled={isProcessingExamId === exam._id}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Audit Logs */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log._id} className="flex items-start gap-3 p-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{formatAuditDetails(log.details)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatAuditActorName(log.userName)}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
