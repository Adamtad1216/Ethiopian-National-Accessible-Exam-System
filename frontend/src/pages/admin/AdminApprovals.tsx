import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  approveExamApi,
  getAllExamsApi,
  publishExamApi,
} from "@/features/admin/services/adminService";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import type { Exam } from "@/types";
import { toast } from "sonner";

export default function AdminApprovals() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingExamId, setProcessingExamId] = useState<string | null>(null);
  const [rejectedExamIds, setRejectedExamIds] = useState<string[]>([]);

  const load = async () => {
    try {
      setIsLoading(true);
      setAllExams(await getAllExamsApi());
    } catch (error) {
      console.error("Failed to fetch exams", error);
      toast.error("Could not load approval queue.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pending = useMemo(
    () =>
      allExams.filter(
        (e) => e.status === "pending" && !rejectedExamIds.includes(e._id),
      ),
    [allExams, rejectedExamIds],
  );

  const handleApprove = async (exam: Exam) => {
    setProcessingExamId(exam._id);
    try {
      await approveExamApi(exam._id);
      await publishExamApi(exam._id);
      setAllExams((prev) =>
        prev.map((item) =>
          item._id === exam._id ? { ...item, status: "published" } : item,
        ),
      );
      toast.success(`${exam.title} approved and published.`);
    } catch (error) {
      console.error("Failed to approve exam", error);
      toast.error("Failed to approve this exam.");
    } finally {
      setProcessingExamId(null);
    }
  };

  const handleReject = (exam: Exam) => {
    setRejectedExamIds((prev) =>
      prev.includes(exam._id) ? prev : [...prev, exam._id],
    );
    toast.success(`${exam.title} marked as rejected locally.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve exams and questions
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card border-warning/20 bg-warning/5">
          <CardContent className="p-5 flex items-center gap-4">
            <Clock className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold font-display">
                {pending.length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-success/20 bg-success/5">
          <CardContent className="p-5 flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold font-display">
                {
                  allExams.filter(
                    (e) => e.status === "approved" || e.status === "published",
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-destructive/20 bg-destructive/5">
          <CardContent className="p-5 flex items-center gap-4">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold font-display">0</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-display">
            Exams Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading approval queue...
            </div>
          ) : pending.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((exam) => (
                <div
                  key={exam._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{exam.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {exam.duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => void handleApprove(exam)}
                      disabled={processingExamId === exam._id}
                    >
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                      {processingExamId === exam._id
                        ? "Approving..."
                        : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleReject(exam)}
                      disabled={processingExamId === exam._id}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
