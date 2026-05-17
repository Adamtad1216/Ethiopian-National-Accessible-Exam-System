import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getAssignedExamsApi,
  getMyResultsApi,
} from "@/features/student/services/studentService";
import { Play, Clock, FileText } from "lucide-react";
import type { Exam } from "@/types";
import { ttsService } from "@/services/tts";
import {
  getHiddenExamIds,
  hideExamForStudent,
} from "@/lib/studentExamVisibility";
import { pickText, resolveLanguage } from "@/lib/locale";

export default function StudentExams() {
  const { user, preferences } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSummaryComplete, setIsSummaryComplete] = useState(false);
  const hasReadSummaryRef = useRef(false);
  const hasStartedScanRef = useRef(false);
  const spokenExamIndexRef = useRef<number>(-1);
  const lastSpokenPromptRef = useRef("");
  const examScanTimeoutRef = useRef<number | null>(null);
  const examScanActiveRef = useRef(false);
  const [confirmExamId, setConfirmExamId] = useState<string | null>(null);

  if (!user || user.role !== "student") return <Navigate to="/login" />;
  const language = resolveLanguage(preferences.language);
  const t = (en: string, am: string) => pickText(language, en, am);

  const availableExams = useMemo(
    () => {
      const hidden = getHiddenExamIds(user._id);
      return exams.filter(
        (exam) =>
          exam.status === "published" &&
          !hidden.has(exam._id) &&
          !completedExamIds.has(exam._id),
      );
    },
    [completedExamIds, exams, user._id],
  );

  const startExam = (exam: Exam) => {
    hideExamForStudent(user._id, exam._id);
    setExams((prev) => prev.filter((item) => item._id !== exam._id));
    navigate(`/student/exam/${exam._id}`);
  };

  useEffect(() => {
    const routeTrigger = sessionStorage.getItem("studentVoiceStartRoute");
    if (routeTrigger === "/student/exams") {
      setVoiceEnabled(true);
      sessionStorage.removeItem("studentVoiceStartRoute");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [assigned, results] = await Promise.all([
          getAssignedExamsApi(),
          getMyResultsApi(),
        ]);
        setExams(assigned);
        setCompletedExamIds(new Set(results.map((result) => result.examId)));
      } catch (error) {
        console.error("Failed to load exams", error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (isLoading) return;
    if (hasReadSummaryRef.current) return;

    hasReadSummaryRef.current = true;

    const summary =
      availableExams.length > 0
        ? language === "am"
          ? `የፈተናዎቼ ማጠቃለያ። ${availableExams.length} ያሉ ፈተናዎች አሉ። ፈተናዎቹን አንድ በአንድ እነብባለሁ። አሁን የተነገረውን ፈተና ለመጀመር Enter ይጫኑ።`
          : `My Exams summary. You have ${availableExams.length} available exams. I will read available exams one by one. Press Enter to start the currently announced exam.`
        : t("My Exams summary. You have no available exams right now.", "የፈተናዎቼ ማጠቃለያ። አሁን የሚገኙ ፈተናዎች የሉም።");

    let cleanupFallback: (() => void) | undefined;

    const speakSummary = async () => {
      try {
        lastSpokenPromptRef.current = summary;
        await ttsService.speak(summary, language);
        setIsSummaryComplete(true);
      } catch {
        const onFirstInteraction = () => {
          void (async () => {
            lastSpokenPromptRef.current = summary;
            await ttsService.speak(summary, language);
            setIsSummaryComplete(true);
          })();
          window.removeEventListener("pointerdown", onFirstInteraction);
          window.removeEventListener("keydown", onFirstInteraction);
          window.removeEventListener("touchstart", onFirstInteraction);
        };

        window.addEventListener("pointerdown", onFirstInteraction, {
          once: true,
        });
        window.addEventListener("keydown", onFirstInteraction, { once: true });
        window.addEventListener("touchstart", onFirstInteraction, {
          once: true,
        });

        cleanupFallback = () => {
          window.removeEventListener("pointerdown", onFirstInteraction);
          window.removeEventListener("keydown", onFirstInteraction);
          window.removeEventListener("touchstart", onFirstInteraction);
        };
      }
    };

    const timer = window.setTimeout(() => {
      void speakSummary();
    }, 450);

    return () => {
      window.clearTimeout(timer);
      cleanupFallback?.();
    };
  }, [availableExams.length, isLoading, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled || !isSummaryComplete) return;
    if (availableExams.length === 0) return;
    if (hasStartedScanRef.current) return;

    hasStartedScanRef.current = true;
    examScanActiveRef.current = true;

    const stopScan = () => {
      examScanActiveRef.current = false;
      if (examScanTimeoutRef.current !== null) {
        window.clearTimeout(examScanTimeoutRef.current);
        examScanTimeoutRef.current = null;
      }
    };

    const speakExamOption = async (index: number) => {
      const exam = availableExams[index];
      if (!exam) return;

      spokenExamIndexRef.current = index;
      const prompt =
        language === "am"
          ? `የፈተናዎቼ አማራጭ ${index + 1} ከ ${availableExams.length}፡ ${exam.title}፣ ትምህርት ${exam.subject}. ፈተናውን ለመጀመር Enter ይጫኑ።`
          : `My Exams option ${index + 1} of ${availableExams.length}: ${exam.title}, subject ${exam.subject}. Press Enter to start this exam.`;
      lastSpokenPromptRef.current = prompt;
      try {
        await ttsService.speak(prompt, language);
      } catch {
        // Ignore speech failures while scanning.
      }
    };

    const speakAndQueueNext = async () => {
      if (!examScanActiveRef.current || availableExams.length === 0) return;

      const currentIndex =
        spokenExamIndexRef.current >= 0 ? spokenExamIndexRef.current : 0;
      await speakExamOption(currentIndex);

      if (!examScanActiveRef.current) return;

      examScanTimeoutRef.current = window.setTimeout(() => {
        if (!examScanActiveRef.current || availableExams.length === 0) return;
        spokenExamIndexRef.current =
          (spokenExamIndexRef.current + 1) % availableExams.length;
        void speakAndQueueNext();
      }, 1200);
    };

    spokenExamIndexRef.current = 0;
    const timer = window.setTimeout(() => {
      void speakAndQueueNext();
    }, 700);

    return () => {
      window.clearTimeout(timer);
      stopScan();
    };
  }, [availableExams, isSummaryComplete, voiceEnabled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "r") {
        if (!voiceEnabled) return;
        if (!lastSpokenPromptRef.current) return;
        event.preventDefault();
        void ttsService.speak(lastSpokenPromptRef.current, language);
        return;
      }

      if (event.defaultPrevented || event.key !== "Enter") return;
      if (!voiceEnabled || !isSummaryComplete) return;
      if (availableExams.length === 0) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      const indexToStart =
        spokenExamIndexRef.current >= 0 ? spokenExamIndexRef.current : 0;
      const selectedExam = availableExams[indexToStart];
      if (!selectedExam) return;

      if (confirmExamId === selectedExam._id) {
        const confirmation =
          language === "am"
            ? `${selectedExam.title} እየተጀመረ ነው።`
            : `Starting ${selectedExam.title}.`;
        lastSpokenPromptRef.current = confirmation;
        void ttsService.speak(confirmation, language);
        startExam(selectedExam);
        setConfirmExamId(null);
        return;
      }

      setConfirmExamId(selectedExam._id);

      examScanActiveRef.current = false;
      if (examScanTimeoutRef.current !== null) {
        window.clearTimeout(examScanTimeoutRef.current);
        examScanTimeoutRef.current = null;
      }

      const confirmation =
        language === "am"
          ? `${selectedExam.title} ተመርጧል። ለማረጋገጥ እና ለመጀመር Enter እንደገና ይጫኑ።`
          : `Selected ${selectedExam.title}. Press Enter again to confirm and start this exam.`;
      lastSpokenPromptRef.current = confirmation;
      void ttsService.speak(confirmation, language);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableExams, confirmExamId, isSummaryComplete, navigate, voiceEnabled]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">{t("My Exams", "የፈተናዎቼ")}</h1>
        <p className="text-sm text-muted-foreground">
          {availableExams.length} {t("exams available", "ያሉ ፈተናዎች")}
        </p>
      </div>

      <div className="grid gap-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("Loading exams...", "ፈተናዎች በመጫን ላይ...")}</p>
        )}
        {availableExams.map((exam) => (
          <Card
            key={exam._id}
            className="shadow-card hover:shadow-elevated transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{exam.title}</h2>
                    {exam.titleAm && (
                      <p className="text-sm text-muted-foreground">
                        {exam.titleAm}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {exam.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline">{exam.subject}</Badge>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" /> {exam.duration} {t("min", "ደቂቃ")}
                      </Badge>
                      <Badge variant="outline">
                        {exam.totalQuestions} {t("questions", "ጥያቄዎች")}
                      </Badge>
                      <Badge variant="outline">{t("Grade", "ክፍል") } {exam.grade}</Badge>
                    </div>
                    {exam.sections.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {exam.sections.map((s) => (
                          <span
                            key={s._id}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {s.name} ({s.questionCount})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  className="bg-gradient-primary self-end sm:self-center"
                  onClick={() => {
                    setConfirmExamId(exam._id);
                    const prompt =
                      language === "am"
                        ? `${exam.title} ተመርጧል። ለማረጋገጥ እና ለመጀመር Enter ይጫኑ።`
                        : `Selected ${exam.title}. Press Enter to confirm and start this exam.`;
                    lastSpokenPromptRef.current = prompt;
                    void ttsService.speak(prompt, language);
                  }}
                  aria-label={
                    language === "am"
                      ? `${exam.title} ፈተናን ይምረጡ እና በ Enter ያረጋግጡ`
                      : `Select ${exam.title} exam and confirm with Enter`
                  }
                >
                  <Play className="mr-2 h-4 w-4" /> {t("Select Exam", "ፈተና ይምረጡ")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
