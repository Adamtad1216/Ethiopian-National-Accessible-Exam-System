import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GraduationCap, Eye, EyeOff, Loader2, Volume2 } from "lucide-react";
import { ttsService } from "@/services/tts";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await login({ email, password });
    setIsLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Login failed");
      ttsService.speak(result.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex" role="main">
      {/* Left hero panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero text-primary-foreground flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
              <GraduationCap className="h-7 w-7 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">ENAES</h1>
              <p className="text-xs opacity-80">
                Ethiopian National Accessible Exam System
              </p>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold font-display leading-tight">
              Accessible Exams
              <br />
              <span className="text-accent">For Every Student</span>
            </h2>
            <p className="mt-4 text-lg opacity-80 max-w-md">
              A fully keyboard-navigable, screen-reader compatible national exam
              platform — built for blind and visually impaired students.
            </p>
          </motion.div>
          <div className="flex gap-4 text-sm opacity-70">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" /> TTS Support
            </div>
            <div>•</div>
            <div>Keyboard-Only</div>
            <div>•</div>
            <div>Offline-Ready</div>
          </div>
        </div>
        <div className="relative z-10 text-xs opacity-50">
          © 2024 Federal Ministry of Education, Ethiopia
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display">ENAES</span>
          </div>

          <Card className="shadow-elevated border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-display">
                Welcome Back
              </CardTitle>
              <CardDescription>
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.gov.et"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    aria-describedby={error ? "login-error" : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                      in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
              Tab
            </kbd>{" "}
            to navigate •
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono ml-1">
              Enter
            </kbd>{" "}
            to submit
          </p>
        </motion.div>
      </div>
    </div>
  );
}
