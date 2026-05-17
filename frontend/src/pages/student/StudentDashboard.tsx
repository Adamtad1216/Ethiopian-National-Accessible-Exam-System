import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Calendar,
  Play,
  Clock,
} from "lucide-react";
import {
  getAssignedExamsApi,
  getMyResultsApi,
} from "@/features/student/services/studentService";
import { motion } from "framer-motion";
import type { Exam, ExamResult } from "@/types";
import { ttsService } from "@/services/tts";
import { pickText, resolveLanguage } from "@/lib/locale";
import {
  getHiddenExamIds,
  hideExamForStudent,
} from "@/lib/studentExamVisibility";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function StudentDashboard() {
  const { user, preferences } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [dashboardVoiceEnabled, setDashboardVoiceEnabled] = useState(false);
  const [isSummaryComplete, setIsSummaryComplete] = useState(false);
  const hasReadDashboardSummaryRef = useRef(false);
  const hasStartedExamScanRef = useRef(false);
  const spokenExamIndexRef = useRef<number>(-1);
  const examScanTimeoutRef = useRef<number | null>(null);
  const examScanActiveRef = useRef(false);

  if (!user || user.role !== "student") return <Navigate to="/login" />;
  const language = resolveLanguage(preferences.language);
  const t = (en: string, am: string) => pickText(language, en, am);

  useEffect(() => {
    const load = async () => {
      try {
        const [assigned, myResults] = await Promise.all([
          getAssignedExamsApi(),
          getMyResultsApi(),
        ]);
        setExams(assigned);
        setResults(myResults);
      } catch (error) {
        console.error("Failed to load student dashboard", error);
      }
    };

    void load();
  }, []);

  const publishedExams = useMemo(() => {
    const hiddenExamIds = getHiddenExamIds(user._id);
    const completedExamIds = new Set(results.map((result) => result.examId));

    return exams.filter(
      (exam) =>
        exam.status === "published" &&
        !hiddenExamIds.has(exam._id) &&
        !completedExamIds.has(exam._id),
    );
  }, [exams, results, user._id]);
  const myResults = useMemo(
    () => results.filter((r) => r.studentId === user._id),
    [results, user._id],
  );
  const firstAvailableExam = publishedExams[0] ?? null;
  const averageScore = myResults.length
    ? Math.round(
        myResults.reduce((acc, r) => acc + r.percentage, 0) / myResults.length,
      )
    : 0;

  const startExam = useCallback(
    (exam: Exam) => {
      hideExamForStudent(user._id, exam._id);
      setExams((prev) => prev.filter((item) => item._id !== exam._id));
      navigate(`/student/exam/${exam._id}`);
    },
    [navigate, user._id],
  );

  useEffect(() => {
    const onDashboardSelected = () => {
      setDashboardVoiceEnabled(true);
    };

    window.addEventListener("student-dashboard-selected", onDashboardSelected);
    return () =>
      window.removeEventListener(
        "student-dashboard-selected",
        onDashboardSelected,
      );
  }, []);

  useEffect(() => {
    if (!dashboardVoiceEnabled) return;
    if (!isSummaryComplete) return;
    if (publishedExams.length === 0) return;
    if (hasStartedExamScanRef.current) return;

    hasStartedExamScanRef.current = true;
    examScanActiveRef.current = true;

    const stopExamScan = () => {
      examScanActiveRef.current = false;
      if (examScanTimeoutRef.current !== null) {
        window.clearTimeout(examScanTimeoutRef.current);
        examScanTimeoutRef.current = null;
      }
    };

    const speakExamOption = async (index: number) => {
      const exam = publishedExams[index];
      if (!exam) return;

      spokenExamIndexRef.current = index;
      const prompt = `Available exam ${index + 1} of ${publishedExams.length}: ${exam.title}, subject ${exam.subject}. Press Enter to start this exam.`;
      try {
        const localizedPrompt =
          language === "am"
            ? `ያሉ ፈተናዎች ${index + 1} ከ ${publishedExams.length}፡ ${exam.title}፣ ትምህርት ${exam.subject}. ፈተናውን ለመጀመር Enter ይጫኑ።`
            : prompt;
        await ttsService.speak(localizedPrompt, language);
      } catch {
        // Ignore speech failures while scanning.
      }
    };

    const speakAndQueueNext = async () => {
      if (!examScanActiveRef.current || publishedExams.length === 0) return;

      const currentIndex =
        spokenExamIndexRef.current >= 0 ? spokenExamIndexRef.current : 0;
      await speakExamOption(currentIndex);

      if (!examScanActiveRef.current) return;

      examScanTimeoutRef.current = window.setTimeout(() => {
        if (!examScanActiveRef.current || publishedExams.length === 0) return;
        spokenExamIndexRef.current =
          (spokenExamIndexRef.current + 1) % publishedExams.length;
        void speakAndQueueNext();
      }, 1200);
    };

    spokenExamIndexRef.current = 0;
    const timer = window.setTimeout(() => {
      void speakAndQueueNext();
    }, 700);

    return () => {
      window.clearTimeout(timer);
      stopExamScan();
    };
  }, [dashboardVoiceEnabled, isSummaryComplete, publishedExams]);

  useEffect(() => {
    if (!dashboardVoiceEnabled) return;
    if (hasReadDashboardSummaryRef.current) return;
    if (exams.length === 0 && results.length === 0) return;

    hasReadDashboardSummaryRef.current = true;

    const summary =
      publishedExams.length > 0 && firstAvailableExam
        ? language === "am"
          ? `የዳሽቦርድ ማጠቃለያ። ${publishedExams.length} የሚገኙ ፈተናዎች፣ ${myResults.length} የተጠናቀቁ ፈተናዎች አሉ፣ አማካይ ውጤት ${averageScore} በመቶ ነው። ፈተናዎቹን አንድ በአንድ እነብባለሁ። አሁን የተነገረውን ፈተና ለመጀመር Enter ይጫኑ።`
          : `Dashboard summary. You have ${publishedExams.length} available exams, ${myResults.length} completed exams, and an average score of ${averageScore} percent. I will read available exams one by one. Press Enter to start the currently announced exam.`
        : language === "am"
          ? `የዳሽቦርድ ማጠቃለያ። አሁን የሚገኙ ፈተናዎች የሉም፣ ${myResults.length} የተጠናቀቁ ፈተናዎች አሉ፣ አማካይ ውጤት ${averageScore} በመቶ ነው።`
          : `Dashboard summary. You have no available exams right now, ${myResults.length} completed exams, and an average score of ${averageScore} percent.`;

    let cleanupFallback: (() => void) | undefined;

    const speakSummary = async () => {
      try {
        await ttsService.speak(summary, language);
        setIsSummaryComplete(true);
      } catch {
        const onFirstInteraction = () => {
          void (async () => {
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
  }, [
    averageScore,
    dashboardVoiceEnabled,
    exams.length,
    firstAvailableExam,
    myResults.length,
    publishedExams.length,
    results.length,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== "Enter") return;
      if (publishedExams.length === 0) return;

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
      const selectedExam = publishedExams[indexToStart];
      if (!selectedExam) return;

      examScanActiveRef.current = false;
      if (examScanTimeoutRef.current !== null) {
        window.clearTimeout(examScanTimeoutRef.current);
        examScanTimeoutRef.current = null;
      }

      const confirmation =
        language === "am"
          ? `${selectedExam.title} እየተጀመረ ነው፣ ትምህርት ${selectedExam.subject}.`
          : `Starting ${selectedExam.title}, subject ${selectedExam.subject}.`;
      void ttsService.speak(confirmation, language);
      startExam(selectedExam);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [publishedExams, startExam]);

  const statCards = [
    {
      label: t("Available Exams", "ያሉ ፈተናዎች"),
      value: publishedExams.length,
      icon: ClipboardList,
      color: "text-primary",
    },
    {
      label: t("Completed", "የተጠናቀቁ"),
      value: myResults.length,
      icon: GraduationCap,
      color: "text-success",
    },
    {
      label: t("Average Score", "አማካይ ውጤት"),
      value: `${averageScore}%`,
      icon: TrendingUp,
      color: "text-info",
    },
    {
      label: t("Upcoming", "የሚመጡ"),
      value: publishedExams.filter(
        (e) => !!e.startTime && new Date(e.startTime) > new Date(),
      ).length,
      icon: Calendar,
      color: "text-warning",
    },
  ];

  return (
    <div
      className="space-y-6"
      role="main"
      aria-label={t("Student Dashboard", "የተማሪ ዳሽቦርድ")}
    >
      <div>
        <h1 className="text-2xl font-bold font-display">
          {t("My Dashboard", "የእኔ ዳሽቦርድ")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {language === "am"
            ? `እንኳን ደህና መጡ፣ ${user.firstName}. ለፈተናዎችዎ ዝግጁ ነዎት።`
            : `Welcome, ${user.firstName}. Ready for your exams.`}
        </p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available Exams */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">
                {t("Available Exams", "ያሉ ፈተናዎች")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {publishedExams.map((exam) => (
                <div
                  key={exam._id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-sm">{exam.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {exam.subject}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {exam.duration}{" "}
                        {t("min", "ደቂቃ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {exam.totalQuestions} {t("Q", "ጥ")}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-primary"
                    onClick={() => startExam(exam)}
                    aria-label={
                      language === "am"
                        ? `${exam.title} ጀምር`
                        : `Start ${exam.title}`
                    }
                  >
                    <Play className="mr-1 h-3.5 w-3.5" /> {t("Start", "ጀምር")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Results */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">
                {t("My Results", "የእኔ ውጤቶች")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t(
                    "No results yet. Complete an exam to see your scores.",
                    "እስካሁን ውጤት የለም። ውጤቶችን ለማየት ፈተና ያጠናቁ።",
                  )}
                </p>
              ) : (
                <div className="space-y-3">
                  {myResults.map((result) => {
                    const exam = exams.find((e) => e._id === result.examId);
                    return (
                      <div key={result._id} className="p-4 rounded-xl border">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm">{exam?.title}</h3>
                          <div className="text-right">
                            <span className="text-2xl font-bold font-display text-primary">
                              {result.percentage}%
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {t("Grade", "ደረጃ")}: {result.grade}
                            </p>
                          </div>
                        </div>
                        <Progress
                          value={result.percentage}
                          className="mt-2 h-2"
                          aria-label={
                            language === "am"
                              ? `ውጤት ${result.percentage} በመቶ`
                              : `Score ${result.percentage} percent`
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="text-center text-xs text-muted-foreground p-4 rounded-lg bg-muted/50">
        <p>
          <kbd className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono">
            Tab
          </kbd>{" "}
          {t("to navigate", "ለመንቀሳቀስ")} •
          <kbd className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono ml-1">
            Enter
          </kbd>{" "}
          {t("to start currently spoken exam", "አሁን የተነበበውን ፈተና ለመጀመር")} •
          <kbd className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono ml-1">
            Alt+R
          </kbd>{" "}
          {t("to hear sidebar choices again", "የጎን ዝርዝሮችን እንደገና ለመስማት")} •
          <kbd className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono ml-1">
            Space
          </kbd>{" "}
          {t("for TTS", "ለድምጽ ንባብ")}
        </p>
      </div>
    </div>
  );
}
