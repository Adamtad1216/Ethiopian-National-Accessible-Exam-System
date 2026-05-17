import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  Loader2,
  Sparkles,
  UserCog,
  ClipboardCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { getSystemSettingsApi } from "@/services/api";

const STAFF_FAILED_ATTEMPTS_KEY = "enaes_staff_failed_login_attempts";

export default function StaffLoginPage() {
  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [failedAttempts, setFailedAttempts] = useState(0);

  React.useEffect(() => {
    const storedFailedAttempts = Number(
      localStorage.getItem(STAFF_FAILED_ATTEMPTS_KEY) ?? "0",
    );
    setFailedAttempts(Number.isFinite(storedFailedAttempts) ? storedFailedAttempts : 0);

    const loadSystemSettings = async () => {
      try {
        const settings = await getSystemSettingsApi();
        setMaxLoginAttempts(settings.maxLoginAttempts);
      } catch {
        // Keep fallback when backend is temporarily unavailable.
      }
    };

    void loadSystemSettings();
  }, []);

  if (isAuthenticated && user) {
    if (user.role === "student") return <Navigate to="/student" />;
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (failedAttempts >= maxLoginAttempts) {
      setError(
        `Too many failed attempts. You have reached the limit of ${maxLoginAttempts}.`,
      );
      return;
    }

    setIsLoading(true);

    const result = await login({ email, password });
    setIsLoading(false);

    if (!result.success) {
      const nextFailedAttempts = failedAttempts + 1;
      setFailedAttempts(nextFailedAttempts);
      localStorage.setItem(
        STAFF_FAILED_ATTEMPTS_KEY,
        String(nextFailedAttempts),
      );
      setError(result.error ?? "Login failed");
      return;
    }

    if (result.role === "student") {
      setError("Student accounts must login using the Student Portal.");
      return;
    }

    localStorage.removeItem(STAFF_FAILED_ATTEMPTS_KEY);
    setFailedAttempts(0);

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl rounded-3xl border bg-card shadow-elevated overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="relative bg-gradient-hero text-primary-foreground p-8 sm:p-10">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-accent blur-3xl" />
              <div className="absolute -bottom-12 right-0 w-56 h-56 rounded-full bg-white/30 blur-3xl" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs tracking-wide">
                <Sparkles className="h-3.5 w-3.5" /> ENAES Control Center
              </div>

              <h1 className="mt-5 text-3xl sm:text-4xl font-bold font-display leading-tight">
                Admin & Examiner
                <br />
                <span className="text-accent">Operations Portal</span>
              </h1>

              <p className="mt-4 text-sm sm:text-base text-primary-foreground/85 max-w-md">
                Secure workspace for exam governance, approvals, audit tracking,
                and institutional account management.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="h-8 w-8 rounded-lg bg-white/20 inline-flex items-center justify-center">
                    <UserCog className="h-4 w-4" />
                  </span>
                  Role-based access for admin and examiner teams
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="h-8 w-8 rounded-lg bg-white/20 inline-flex items-center justify-center">
                    <ClipboardCheck className="h-4 w-4" />
                  </span>
                  Fast exam review, publishing, and compliance logs
                </div>
              </div>
            </motion.div>
          </div>

          <div className="p-8 sm:p-10 bg-card">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0 text-left">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                  <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-2xl">Sign in</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Continue to the staff workspace
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Work Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11"
                    />
                  </div>

                  {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {maxLoginAttempts > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Failed attempts: {failedAttempts}/{maxLoginAttempts}
                    </p>
                  )}

                  <Button
                    className="w-full h-11 bg-gradient-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Please wait...
                      </>
                    ) : (
                      "Login to Staff Portal"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
