import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getAllExamsApi,
  getMyResultsApi,
} from "@/features/exam/services/examService";
import { GraduationCap, ListChecks, TrendingUp } from "lucide-react";
import type { Exam, ExamResult } from "@/types";
import { ttsService } from "@/services/tts";
import { pickText, resolveLanguage } from "@/lib/locale";

export default function StudentResults() {
  const { user, preferences } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSummaryComplete, setIsSummaryComplete] = useState(false);
  const hasReadSummaryRef = useRef(false);
  const hasStartedScanRef = useRef(false);
  const spokenResultIndexRef = useRef<number>(-1);
  const lastSpokenPromptRef = useRef("");
  const resultScanTimeoutRef = useRef<number | null>(null);
  const resultScanActiveRef = useRef(false);
  const language = resolveLanguage(preferences.language);
  const t = (en: string, am: string) => pickText(language, en, am);

  useEffect(() => {
    const routeTrigger = sessionStorage.getItem("studentVoiceStartRoute");
    if (routeTrigger === "/student/results") {
      setVoiceEnabled(true);
      sessionStorage.removeItem("studentVoiceStartRoute");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [resultsRes, examsRes] = await Promise.all([
          getMyResultsApi(),
          getAllExamsApi(),
        ]);
        setResults(resultsRes);
        setExams(examsRes);
      } catch (error) {
        console.error("Failed to load results", error);
      }
    };

    void load();
  }, []);

  const myResults = useMemo(
    () => results.filter((r) => r.studentId === user?._id),
    [results, user?._id],
  );

  useEffect(() => {
    if (!voiceEnabled) return;
    if (hasReadSummaryRef.current) return;
    if (results.length === 0 && exams.length === 0) return;

    hasReadSummaryRef.current = true;

    const averageScore =
      myResults.length > 0
        ? Math.round(
            myResults.reduce((total, result) => total + result.percentage, 0) /
              myResults.length,
          )
        : 0;

    const summary =
      myResults.length > 0
        ? language === "am"
          ? `የውጤቶቼ ማጠቃለያ። ${myResults.length} ውጤቶች አሉ፣ አማካይ ውጤት ${averageScore} በመቶ ነው። ውጤቶቹን አንድ በአንድ እነብባለሁ። አሁን የተነገረውን የፈተና ግምገማ ለመክፈት Enter ይጫኑ። የመጨረሻውን ድምጽ ለመድገም Alt + R ይጫኑ።`
          : `My Results summary. You have ${myResults.length} results, with an average score of ${averageScore} percent. I will read your results one by one. Press Enter to open the currently announced exam review. Press Alt plus R to hear the last spoken result again.`
        : t("My Results summary. You do not have any results yet.", "የውጤቶቼ ማጠቃለያ። እስካሁን ውጤት የለዎትም።");

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
  }, [exams.length, myResults, results.length, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled || !isSummaryComplete) return;
    if (myResults.length === 0) return;
    if (hasStartedScanRef.current) return;

    hasStartedScanRef.current = true;
    resultScanActiveRef.current = true;

    const stopScan = () => {
      resultScanActiveRef.current = false;
      if (resultScanTimeoutRef.current !== null) {
        window.clearTimeout(resultScanTimeoutRef.current);
        resultScanTimeoutRef.current = null;
      }
    };

    const speakResult = async (index: number) => {
      const result = myResults[index];
      if (!result) return;
      const exam = exams.find((e) => e._id === result.examId);
      const examTitle = exam?.title ?? t("Unknown exam", "ያልታወቀ ፈተና");
      const takenAt = new Date(result.publishedAt).toLocaleString();

      spokenResultIndexRef.current = index;
      const prompt =
        language === "am"
          ? `ውጤት ${index + 1} ከ ${myResults.length}፡ ${examTitle}. የተወሰደበት ${takenAt}. ውጤት ${result.percentage} በመቶ። ደረጃ ${result.grade}. ትክክለኛ መልሶች ${result.totalCorrect} ከ ${result.totalQuestions}. ዝርዝር ግምገማ ለመክፈት Enter ይጫኑ።`
          : `Result ${index + 1} of ${myResults.length}: ${examTitle}. Taken on ${takenAt}. Score ${result.percentage} percent. Grade ${result.grade}. Correct answers ${result.totalCorrect} out of ${result.totalQuestions}. Press Enter to open detailed review.`;
      lastSpokenPromptRef.current = prompt;
      try {
        await ttsService.speak(prompt, language);
      } catch {
        // Ignore speech failures while scanning.
      }
    };

    const speakAndQueueNext = async () => {
      if (!resultScanActiveRef.current || myResults.length === 0) return;

      const currentIndex =
        spokenResultIndexRef.current >= 0 ? spokenResultIndexRef.current : 0;
      await speakResult(currentIndex);

      if (!resultScanActiveRef.current) return;

      resultScanTimeoutRef.current = window.setTimeout(() => {
        if (!resultScanActiveRef.current || myResults.length === 0) return;
        spokenResultIndexRef.current =
          (spokenResultIndexRef.current + 1) % myResults.length;
        void speakAndQueueNext();
      }, 1200);
    };

    spokenResultIndexRef.current = 0;
    const timer = window.setTimeout(() => {
      void speakAndQueueNext();
    }, 700);

    return () => {
      window.clearTimeout(timer);
      stopScan();
    };
  }, [exams, isSummaryComplete, myResults, voiceEnabled]);

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
      if (myResults.length === 0) return;

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
      const indexToReview =
        spokenResultIndexRef.current >= 0 ? spokenResultIndexRef.current : 0;
      const selectedResult = myResults[indexToReview];
      if (!selectedResult) return;

      resultScanActiveRef.current = false;
      if (resultScanTimeoutRef.current !== null) {
        window.clearTimeout(resultScanTimeoutRef.current);
        resultScanTimeoutRef.current = null;
      }

      const exam = exams.find((e) => e._id === selectedResult.examId);
      const examTitle = exam?.title ?? t("selected exam", "የተመረጠ ፈተና");
      const confirmation =
        language === "am"
          ? `ለ ${examTitle} ዝርዝር ግምገማ በመክፈት ላይ።`
          : `Opening detailed review for ${examTitle}.`;
      lastSpokenPromptRef.current = confirmation;
      void ttsService.speak(confirmation, language);
      navigate(`/student/results/${selectedResult.examId}`);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exams, isSummaryComplete, myResults, navigate, voiceEnabled]);

  if (!user || user.role !== "student") return <Navigate to="/login" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{t("My Results", "የእኔ ውጤቶች")}</h1>
          <p className="text-sm text-muted-foreground">
            {myResults.length} {t("results available", "ያሉ ውጤቶች")}
          </p>
        </div>
      </div>

      {myResults.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-display text-lg font-medium">{t("No Results Yet", "እስካሁን ውጤት የለም")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Complete your exams to see results here.", "ውጤቶችን እዚህ ለማየት ፈተናዎችዎን ያጠናቁ።")}
            </p>
          </CardContent>
        </Card>
      ) : (
        myResults.map((result) => {
          const exam = exams.find((e) => e._id === result.examId);
          return (
            <Card key={result._id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">
                    {exam?.title}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/student/results/${result.examId}`)}
                  >
                    <ListChecks className="mr-1 h-3.5 w-3.5" /> {t("Review", "ግምገማ")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Taken on", "የተወሰደበት")} {new Date(result.publishedAt).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-3 mb-6">
                  <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-4xl font-bold font-display text-primary">
                      {result.percentage}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Total Score", "ጠቅላላ ውጤት")}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-success/5 border border-success/10">
                    <p className="text-4xl font-bold font-display text-success">
                      {result.totalCorrect}/{result.totalQuestions}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Correct Answers", "ትክክለኛ መልሶች")}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-warning/5 border border-warning/10">
                    <p className="text-4xl font-bold font-display text-warning">
                      {result.grade}
                    </p>
                      <p className="text-xs text-muted-foreground mt-1">{t("Grade", "ደረጃ")}</p>
                  </div>
                </div>

                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> {t("Section Breakdown", "የክፍል ውጤት ዝርዝር")}
                </h4>
                <div className="space-y-3">
                  {result.sectionScores.map((s) => (
                    <div key={s.sectionId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{s.sectionName}</span>
                        <span className="text-sm font-medium">
                          {s.correct}/{s.total} ({s.percentage}%)
                        </span>
                      </div>
                      <Progress
                        value={s.percentage}
                        className="h-3"
                        aria-label={`${s.sectionName} score: ${s.percentage}%`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
