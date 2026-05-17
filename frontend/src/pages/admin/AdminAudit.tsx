import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditLogsApi } from "@/features/admin/services/adminService";
import { formatAuditActorName, formatAuditDetails } from "@/lib/auditFormatter";
import { Shield, Search } from "lucide-react";

export default function AdminAudit() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [logs, setLogs] = useState<
    Array<{
      _id: string;
      userName: string;
      action: string;
      details: string | Record<string, unknown>;
      timestamp: string;
    }>
  >([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLogs(await getAuditLogsApi());
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      }
    };

    void load();
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch = `${formatAuditActorName(log.userName)} ${formatAuditDetails(log.details)}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actionColors: Record<string, string> = {
    login: "bg-info/10 text-info",
    logout: "bg-muted text-muted-foreground",
    exam_created: "bg-primary/10 text-primary",
    exam_approved: "bg-success/10 text-success",
    exam_rejected: "bg-destructive/10 text-destructive",
    exam_started: "bg-warning/10 text-warning",
    exam_submitted: "bg-success/10 text-success",
    tab_switch: "bg-destructive/10 text-destructive",
    exam_submitted_approval: "bg-warning/10 text-warning",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Append-only activity log for all system events
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="exam_created">Exam Created</SelectItem>
                <SelectItem value="exam_approved">Exam Approved</SelectItem>
                <SelectItem value="exam_started">Exam Started</SelectItem>
                <SelectItem value="exam_submitted">Exam Submitted</SelectItem>
                <SelectItem value="tab_switch">Tab Switch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((log) => (
              <div
                key={log._id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center gap-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{formatAuditDetails(log.details)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatAuditActorName(log.userName)}
                    </span>
                    <Badge
                      className={`text-[10px] h-4 border-0 ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}
                    >
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
