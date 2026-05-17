import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getAssignedExamsApi,
  getExamQuestionsApi,
  getSystemSettingsApi,
  gradeExamApi,
  submitResponseApi,
  syncResponsesApi,
} from "@/features/student/services/studentService";
import { ttsService } from "@/services/tts";
import {
  getUnsyncedResponses,
  markResponsesSynced,
  saveResponse,
} from "@/services/offlineDb";
import { hideExamForStudent } from "@/lib/studentExamVisibility";
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Keyboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam, Question } from "@/types";
import { pickText, resolveLanguage } from "@/lib/locale";

export default function ExamPlayer() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user, preferences } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [examLoadError, setExamLoadError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0, percentage: 0 });
  const [ttsEnabled, setTtsEnabled] = useState(preferences.tts.enabled);
  const [integrityChecksEnabled, setIntegrityChecksEnabled] = useState(true);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [introComplete, setIntroComplete] = useState(!preferences.tts.enabled);
  const [timerActive, setTimerActive] = useState(!preferences.tts.enabled);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const questionRefs = useRef<HTMLDivElement>(null);
  const instructionsSpokenRef = useRef(false);
  const language = resolveLanguage(preferences.language);
  const t = (en: string, am: string) => pickText(language, en, am);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || null;
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    const loadExam = async () => {
      if (!examId) return;
      try {
        setExamLoadError(null);
        const [assignedExams, examQuestions] = await Promise.all([
          getAssignedExamsApi(),
          getExamQuestionsApi(examId),
        ]);
        setExam(assignedExams.find((e) => e._id === examId) ?? null);
        setQuestions(examQuestions);
      } catch (error) {
        console.error("Failed to load exam player data", error);
        const message =
          error instanceof Error
            ? error.message
            : "This exam is not available right now.";

        if (
          message
            .toLowerCase()
            .includes("only take exams during their scheduled time")
        ) {
          setExamLoadError(
            t(
              "This exam can only be opened during its scheduled start and end time.",
              "ይህ ፈተና የተወሰነለት የመጀመሪያ እና የመጨረሻ ሰዓት ውስጥ ብቻ ይከፈታል።",
            ),
          );
        } else {
          setExamLoadError(message);
        }
      } finally {
        setIsLoadingExam(false);
      }
    };

    void loadExam();
  }, [examId]);

  useEffect(() => {
    if (!examId || !user) return;
    hideExamForStudent(user._id, examId);
  }, [examId, user]);

  useEffect(() => {
    const loadSystemSettings = async () => {
      try {
        const settings = await getSystemSettingsApi();
        setIntegrityChecksEnabled(settings.examIntegrityChecks);
        setAllowLateSubmission(settings.allowLateSubmission);
      } catch {
        // Keep secure defaults if settings request fails.
      }
    };

    void loadSystemSettings();
  }, []);

  const selectAnswer = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }));

      if (!examId || !user) return;

      const optionIndex = Number(optionId.split("-").pop());
      const answeredAt = new Date().toISOString();

      void saveResponse({
        _id: `resp-${user._id}-${questionId}`,
        sessionId: `session-${examId}`,
        examId,
        studentId: user._id,
        questionId,
        selectedOption: optionId,
        answeredAt,
        synced: false,
      });

      if (!isOnline || Number.isNaN(optionIndex)) return;

      void Promise.resolve()
        .then(() =>
          submitResponseApi({
            examId,
            questionId,
            selectedOption: optionIndex,
            answeredAt,
          }),
        )
        .catch((error) => {
          console.error("Failed to auto-save response", error);
        });
    },
    [examId, isOnline, user],
  );

  const goToNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, totalQuestions]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const speakCurrentQuestion = useCallback(() => {
    if (!currentQuestion) return;

    const lang =
      preferences.language === "am" && currentQuestion.textAm ? "am" : "en";
    const text = lang === "am" ? currentQuestion.textAm! : currentQuestion.text;
    const opts = currentQuestion.options.map((o) => ({
      label: o.label,
      text: lang === "am" && o.textAm ? o.textAm : o.text,
    }));

    if (currentIndex === totalQuestions - 1) {
      const optionsText = opts
        .map((option) =>
          lang === "am"
            ? `ምርጫ ${option.label}. ${option.text}`
            : `Option ${option.label}. ${option.text}`,
        )
        .join(". ");
      const finalQuestionPrompt =
        lang === "am"
          ? `ጥያቄ ${currentIndex + 1}. ${text}. ${optionsText}.`
          : `Question ${currentIndex + 1}. ${text}. ${optionsText}.`;
      const finalQuestionInstruction =
        lang === "am"
          ? "ይህ የመጨረሻ ጥያቄ ነው። ፈተናውን ለመላክ Enter ይጫኑ። ሁሉንም ጥያቄዎች እና መልሶችዎን ለማዳመጥ Alt + R ይጫኑ።"
          : "This is the final question. If you want to submit the exam, press Enter. If you want to listen to every question and your answer, press Alt plus R.";

      void ttsService
        .speak(finalQuestionPrompt, lang)
        .then(() => ttsService.speak(finalQuestionInstruction, lang));
      return;
    }

    ttsService.speakQuestion(text, opts, lang, currentIndex + 1);
  }, [currentQuestion, currentIndex, preferences.language, totalQuestions]);

  const handleSubmit = useCallback(async () => {
    if (!examId) return;

    try {
      if (user) {
        hideExamForStudent(user._id, examId);
      }
      const graded = await gradeExamApi(examId);
      const correct = Math.round((graded.score / 100) * totalQuestions);
      setScore({ correct, total: totalQuestions, percentage: graded.score });
      setShowSubmitDialog(false);
      setShowResults(true);
      ttsService.stop();
      if (ttsEnabled) {
        const summary =
          language === "am"
            ? `ውጤትዎ ${graded.score} በመቶ ነው። ${correct} ከ ${totalQuestions} ጥያቄዎች ትክክል መልሰዋል።`
            : `Your result is ${graded.score} percent. You answered ${correct} out of ${totalQuestions} questions correctly.`;
        void ttsService.speak(summary, language);
      }
    } catch (error) {
      console.error("Failed to submit exam", error);
    }
  }, [examId, language, totalQuestions, ttsEnabled, user]);

  const speakExamReviewSummary = useCallback(() => {
    if (!ttsEnabled) return;

    const reviewText = questions
      .map((question, index) => {
        const selectedOptionId = answers[question._id];
        const selectedOption = question.options.find(
          (option) => option._id === selectedOptionId,
        );
        const answerText = selectedOption
          ? language === "am"
            ? `የእርስዎ መልስ ምርጫ ${selectedOption.label}. ${selectedOption.textAm ?? selectedOption.text}.`
            : `Your answer is option ${selectedOption.label}. ${selectedOption.text}.`
          : t("This question is unanswered.", "ይህ ጥያቄ አልተመለሰም።");
        const questionText =
          language === "am"
            ? (question.textAm ?? question.text)
            : question.text;
        return language === "am"
          ? `ጥያቄ ${index + 1}. ${questionText}. ${answerText}`
          : `Question ${index + 1}. ${questionText}. ${answerText}`;
      })
      .join(" ");

    if (!reviewText.trim()) return;
    void ttsService.speak(reviewText, language);
  }, [answers, questions, ttsEnabled, language, t]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Timer init
  useEffect(() => {
    if (exam) setTimeRemaining(exam.duration * 60);
  }, [exam]);

  useEffect(() => {
    if (!exam || questions.length === 0) return;
    if (preferences.tts.enabled) {
      setIntroComplete(false);
      setTimerActive(false);
      instructionsSpokenRef.current = false;
      return;
    }

    setIntroComplete(true);
    setTimerActive(true);
    instructionsSpokenRef.current = true;
  }, [exam, questions.length, preferences.tts.enabled]);

  useEffect(() => {
    setTtsEnabled(preferences.tts.enabled);
  }, [preferences.tts.enabled]);

  useEffect(() => {
    if (ttsEnabled) return;
    if (introComplete && timerActive) return;

    setIntroComplete(true);
    setTimerActive(true);
    instructionsSpokenRef.current = true;
  }, [ttsEnabled, introComplete, timerActive]);

  // Timer countdown
  useEffect(() => {
    if (!exam || showResults || !timerActive) return;
    if (!allowLateSubmission && timeRemaining <= 0 && timeRemaining !== 0) {
      void handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = allowLateSubmission ? prev - 1 : Math.max(prev - 1, 0);
        if (next === 600 && ttsEnabled) ttsService.speakTimeAlert(10, language);
        if (next === 60 && ttsEnabled) ttsService.speakTimeAlert(1, language);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    allowLateSubmission,
    timeRemaining,
    ttsEnabled,
    language,
    exam,
    showResults,
    handleSubmit,
    timerActive,
  ]);

  // Online status
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Tab switch detection
  useEffect(() => {
    if (!integrityChecksEnabled) return;
    const h = () => {
      if (document.hidden) setTabSwitches((prev) => prev + 1);
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [integrityChecksEnabled]);

  // Copy/paste blocking
  useEffect(() => {
    if (!integrityChecksEnabled) return;
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("cut", block);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("cut", block);
    };
  }, [integrityChecksEnabled]);

  // Sync offline responses when connected
  useEffect(() => {
    if (!examId || !isOnline) return;

    const sync = async () => {
      try {
        const unsynced = await getUnsyncedResponses();
        const relevant = unsynced.filter(
          (r) => r.examId === examId && typeof r.selectedOption === "string",
        );
        if (relevant.length === 0) return;

        const payload = relevant
          .map((r) => ({
            examId: r.examId,
            questionId: r.questionId,
            selectedOption: Number((r.selectedOption ?? "").split("-").pop()),
            answeredAt: r.answeredAt,
          }))
          .filter((r) => !Number.isNaN(r.selectedOption));

        const result = await syncResponsesApi({ responses: payload });
        await markResponsesSynced(result.synced.map((s) => s.id));
      } catch (error) {
        console.error("Failed syncing offline responses", error);
      }
    };

    void sync();
  }, [examId, isOnline]);

  // Intro narration before timer starts
  useEffect(() => {
    if (!ttsEnabled || !currentQuestion || introComplete) return;
    if (instructionsSpokenRef.current) return;

    instructionsSpokenRef.current = true;
    let cancelled = false;

    const runIntro = async () => {
      const instructions =
        language === "am"
          ? "መመሪያ። አሁን ያለውን ጥያቄ እና ምርጫዎች ለመድገም Alt + R ይጫኑ። ምርጫ ለመምረጥ 1 እስከ 4 ቁልፎችን ይጠቀሙ። የተመረጠውን መልስ ለማረጋገጥ እና ወደ ቀጣይ ጥያቄ ለመሄድ Enter ይጫኑ።"
          : "Instructions. Press Alt plus R to repeat the current question and options. Use keys 1 to 4 to select an option. Press Enter to confirm your selected answer and move to the next question.";

      try {
        await ttsService.speak(instructions, language);
      } catch {
        // Continue start flow even if speech API fails.
      }

      if (cancelled) return;

      try {
        await ttsService.speak(
          t("Timer starts now.", "ሰዓት አሁን ተጀምሯል።"),
          language,
        );
      } catch {
        // Continue start flow even if speech API fails.
      }

      if (cancelled) return;
      setIntroComplete(true);
      setTimerActive(true);
    };

    void runIntro();

    return () => {
      cancelled = true;
      ttsService.stop();
    };
  }, [currentQuestion, introComplete, ttsEnabled, language, t]);

  // TTS on question change after intro
  useEffect(() => {
    if (ttsEnabled && currentQuestion && introComplete) {
      speakCurrentQuestion();
    }
    return () => ttsService.stop();
  }, [currentQuestion, introComplete, speakCurrentQuestion, ttsEnabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitDialog || showResults || !currentQuestion) return;

      if (e.altKey && e.key.toLowerCase() === "r") {
        if (!ttsEnabled) return;
        e.preventDefault();
        if (currentIndex === totalQuestions - 1) {
          speakExamReviewSummary();
          return;
        }
        speakCurrentQuestion();
        return;
      }

      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }

        const selectedOptionId = answers[currentQuestion._id];
        if (!selectedOptionId) return;

        e.preventDefault();
        if (currentIndex === totalQuestions - 1) {
          void handleSubmit();
        } else {
          goToNext();
        }
        return;
      }

      switch (e.key) {
        case "1":
        case "2":
        case "3":
        case "4": {
          const i = parseInt(e.key) - 1;
          if (currentQuestion.options[i]) {
            selectAnswer(currentQuestion._id, currentQuestion.options[i]._id);
          }
          break;
        }
        case "5":
          e.preventDefault();
          goToPrev();
          break;
        case "6":
          e.preventDefault();
          goToNext();
          break;
        case " ":
          e.preventDefault();
          if (ttsEnabled) speakCurrentQuestion();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentQuestion,
    ttsEnabled,
    showSubmitDialog,
    showResults,
    selectAnswer,
    goToPrev,
    goToNext,
    speakCurrentQuestion,
    answers,
    currentIndex,
    totalQuestions,
    handleSubmit,
    speakExamReviewSummary,
  ]);

  // === Early returns AFTER all hooks ===
  if (!user || user.role !== "student") return <Navigate to="/login" />;

  if (isLoadingExam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-display font-bold">
            {t("Loading exam...", "ፈተና በመጫን ላይ...")}
          </h2>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0 || examLoadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-warning" />
          <h2 className="text-xl font-display font-bold">
            {t("Exam Unavailable", "ፈተናው አይገኝም")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {examLoadError ||
              t(
                "This exam is not available right now or has no questions.",
                "ይህ ፈተና አሁን አይገኝም ወይም ጥያቄዎች የሉትም።",
              )}
          </p>
          <Button className="mt-4" onClick={() => navigate("/student")}>
            {t("Return to Dashboard", "ወደ ዳሽቦርድ ተመለስ")}
          </Button>
        </div>
      </div>
    );
  }

  const timeColor =
    timeRemaining <= 60
      ? "text-destructive"
      : timeRemaining <= 600
        ? "text-warning"
        : "text-foreground";

  if (showResults) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg"
        >
          <div className="text-center p-8 rounded-2xl shadow-elevated bg-card border">
            <div
              className={`mx-auto mb-4 h-24 w-24 rounded-full flex items-center justify-center ${score.percentage >= 70 ? "bg-success/10" : score.percentage >= 50 ? "bg-warning/10" : "bg-destructive/10"}`}
            >
              <span
                className={`text-4xl font-bold font-display ${score.percentage >= 70 ? "text-success" : score.percentage >= 50 ? "text-warning" : "text-destructive"}`}
              >
                {score.percentage}%
              </span>
            </div>
            <h2 className="text-2xl font-bold font-display">
              {t("Exam Completed", "ፈተናው ተጠናቋል")}
            </h2>
            <p className="text-muted-foreground mt-1">{exam.title}</p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-2xl font-bold font-display">
                  {score.correct}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Correct", "ትክክል")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-2xl font-bold font-display">
                  {score.total - score.correct}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Incorrect", "ስህተት")}
                </p>
              </div>
            </div>
            {tabSwitches > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
                ⚠️ {tabSwitches}{" "}
                {t("tab switch(es) detected", "የታብ መቀየር ተገኝቷል")}
              </div>
            )}
            <Button
              className="mt-6 bg-gradient-primary"
              onClick={() => navigate("/student")}
            >
              {t("Return to Dashboard", "ወደ ዳሽቦርድ ተመለስ")}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      role="main"
      aria-label={t("Exam Player", "የፈተና መጫወቻ")}
    >
      <a href="#question-content" className="skip-link">
        {t("Skip to question", "ወደ ጥያቄ ዝለል")}
      </a>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold truncate font-display">
              {exam.title}
            </h1>
            <Badge
              variant="outline"
              className={`text-[10px] h-5 ${isOnline ? "text-success border-success/30" : "text-warning border-warning/30"}`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 mr-0.5" /> {t("Online", "በመስመር ላይ")}
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-0.5" />{" "}
                  {t("Offline", "ከመስመር ውጭ")}
                </>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowShortcuts(!showShortcuts)}
              aria-label={t("Keyboard shortcuts", "የቁልፍ አቋራጮች")}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setTtsEnabled(!ttsEnabled);
                ttsService.stop();
              }}
              aria-label={
                ttsEnabled
                  ? t("Disable TTS", "TTS አጥፋ")
                  : t("Enable TTS", "TTS አስጀምር")
              }
            >
              {ttsEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <div
              className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timeColor}`}
              role="timer"
              aria-label={`${t("Time remaining", "የቀረ ጊዜ")}: ${formatTime(timeRemaining)}`}
            >
              <Clock className="h-4 w-4" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-muted border-b"
          >
            <div className="max-w-4xl mx-auto p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <kbd className="px-1.5 py-0.5 rounded bg-background font-mono">
                  1-4
                </kbd>{" "}
                {t("Select option", "ምርጫ ይምረጡ")}
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 rounded bg-background font-mono">
                  5
                </kbd>{" "}
                {t("Previous", "ቀዳሚ")}
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 rounded bg-background font-mono">
                  6
                </kbd>{" "}
                {t("Next", "ቀጣይ")}
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 rounded bg-background font-mono">
                  Enter
                </kbd>{" "}
                {t("Confirm answer and next", "መልስ ያረጋግጡ እና ቀጣይ")}
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 rounded bg-background font-mono">
                  Alt+R
                </kbd>{" "}
                {t("Repeat question and options", "ጥያቄን እና ምርጫዎችን ድገም")}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border-b px-4 py-2">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {t("Question", "ጥያቄ")} {currentIndex + 1} {t("of", "ከ")}{" "}
              {totalQuestions}
            </span>
            <span className="text-xs text-muted-foreground">
              {answeredCount}/{totalQuestions} {t("answered", "ተመልሷል")}
            </span>
          </div>
          <Progress
            value={((currentIndex + 1) / totalQuestions) * 100}
            className="h-1.5"
          />
        </div>
      </div>

      <div className="bg-card/50 border-b px-4 py-2 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex gap-1.5 justify-center flex-wrap">
          {questions.map((q, i) => (
            <button
              key={q._id}
              onClick={() => setCurrentIndex(i)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${i === currentIndex ? "bg-primary text-primary-foreground shadow-glow" : answers[q._id] ? "bg-success/20 text-success border border-success/30" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              aria-label={`${t("Question", "ጥያቄ")} ${i + 1}${answers[q._id] ? `, ${t("answered", "ተመልሷል")}` : ""}`}
              aria-current={i === currentIndex ? "true" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 px-4 py-6"
        id="question-content"
        ref={questionRefs}
      >
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentQuestion.sectionId && (
                <Badge variant="outline" className="mb-4 text-xs">
                  {exam.sections.find(
                    (s) => s._id === currentQuestion.sectionId,
                  )?.name || t("Section", "ክፍል")}
                </Badge>
              )}
              <div className="mb-6">
                <h2
                  className="text-xl font-display font-semibold leading-relaxed"
                  aria-live="polite"
                >
                  {currentQuestion.questionNumber}.{" "}
                  {language === "am"
                    ? (currentQuestion.textAm ?? currentQuestion.text)
                    : currentQuestion.text}
                </h2>
                {currentQuestion.textAm && language !== "am" && (
                  <p className="text-base text-muted-foreground mt-2" lang="am">
                    {currentQuestion.textAm}
                  </p>
                )}
              </div>
              <div
                className="space-y-3"
                role="group"
                aria-label={t("Answer options", "የመልስ ምርጫዎች")}
              >
                {currentQuestion.options.map((option, optIndex) => {
                  const isSelected =
                    answers[currentQuestion._id] === option._id;
                  return (
                    <button
                      key={option._id}
                      onClick={() => {
                        selectAnswer(currentQuestion._id, option._id);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                      aria-label={`${t("Option", "ምርጫ")} ${option.label}: ${language === "am" ? (option.textAm ?? option.text) : option.text}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          {optIndex + 1}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">
                            {option.label}.{" "}
                            {language === "am"
                              ? (option.textAm ?? option.text)
                              : option.text}
                          </span>
                          {option.textAm && language !== "am" && (
                            <p
                              className="text-sm text-muted-foreground mt-0.5"
                              lang="am"
                            >
                              {option.textAm}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                          >
                            <svg
                              className="h-3.5 w-3.5 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            aria-label={t("Previous question (key: 5)", "ቀዳሚ ጥያቄ (ቁልፍ: 5)")}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> {t("Previous", "ቀዳሚ")}{" "}
            <kbd className="ml-2 px-1 py-0.5 rounded bg-muted text-[10px] font-mono hidden sm:inline">
              5
            </kbd>
          </Button>
          {currentIndex === totalQuestions - 1 ? (
            <Button
              className="bg-gradient-primary"
              onClick={() => setShowSubmitDialog(true)}
              aria-label={t("Submit exam", "ፈተና ላክ")}
            >
              <Send className="mr-2 h-4 w-4" /> {t("Submit Exam", "ፈተና ላክ")}
            </Button>
          ) : (
            <Button
              onClick={goToNext}
              aria-label={t("Next question (key: 6)", "ቀጣይ ጥያቄ (ቁልፍ: 6)")}
            >
              {t("Next", "ቀጣይ")} <ChevronRight className="ml-1 h-4 w-4" />{" "}
              <kbd className="ml-2 px-1 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono hidden sm:inline">
                6
              </kbd>
            </Button>
          )}
        </div>
      </footer>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Submit Exam?", "ፈተና ይላክ?")}</DialogTitle>
            <DialogDescription>
              {t("You have answered", "እስካሁን የመለሱት")} {answeredCount}{" "}
              {t("out of", "ከ")} {totalQuestions}{" "}
              {t("questions.", "ጥያቄዎች ናቸው።")}
              {answeredCount < totalQuestions && (
                <span className="block mt-1 text-warning font-medium">
                  ⚠️ {totalQuestions - answeredCount}{" "}
                  {t("question(s) are unanswered.", "ጥያቄ(ዎች) አልተመለሱም።")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
            >
              {t("Continue Exam", "ፈተናውን ቀጥል")}
            </Button>
            <Button
              className="bg-gradient-primary"
              onClick={() => void handleSubmit()}
            >
              <Send className="mr-2 h-4 w-4" />{" "}
              {t("Confirm Submit", "ላክን አረጋግጥ")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
