import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { getResultReviewApi, getExaminerResultReviewApi } from "@/services/api";
import { ttsService } from "@/services/tts";
import { pickText, resolveLanguage } from "@/lib/locale";

type ReviewQuestion = {
  id: string;
  text: string;
  options: string[];
  selectedOption: number | null;
  correctAnswer: number;
  isCorrect: boolean | null;
  answeredAt?: string;
};

export default function StudentResultReview() {
  const { user, preferences } = useAuth();
  const { examId, studentId } = useParams<{ examId: string; studentId?: string }>();
  const navigate = useNavigate();
  const language = resolveLanguage(preferences.language);
  const t = (en: string, am: string) => pickText(language, en, am);

  const [isLoading, setIsLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("Exam review");
  const [examSubject, setExamSubject] = useState<string | undefined>(undefined);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questions[currentIndex] ?? null;

  const speakCurrentReview = useCallback(() => {
    if (!currentQuestion) return;

    const selectedAnswerText =
      typeof currentQuestion.selectedOption === "number" &&
      currentQuestion.options[currentQuestion.selectedOption]
        ? language === "am"
          ? `የእርስዎ መልስ ምርጫ ${String.fromCharCode(65 + currentQuestion.selectedOption)} ነው። ${currentQuestion.options[currentQuestion.selectedOption]}.`
          : `Your answer is option ${String.fromCharCode(65 + currentQuestion.selectedOption)}. ${currentQuestion.options[currentQuestion.selectedOption]}.`
        : t("You did not answer this question.", "ይህን ጥያቄ አልመለሱም።");

    const outcomeText =
      currentQuestion.isCorrect === true
        ? t("Result: correct.", "ውጤት: ትክክል።")
        : currentQuestion.isCorrect === false
          ? t("Result: wrong.", "ውጤት: ስህተት።")
          : t("Result: not answered.", "ውጤት: አልተመለሰም።");

    const correctAnswerText =
      currentQuestion.options[currentQuestion.correctAnswer]
        ? language === "am"
          ? `ትክክለኛው መልስ ምርጫ ${String.fromCharCode(65 + currentQuestion.correctAnswer)} ነው። ${currentQuestion.options[currentQuestion.correctAnswer]}.`
          : `Correct answer is option ${String.fromCharCode(65 + currentQuestion.correctAnswer)}. ${currentQuestion.options[currentQuestion.correctAnswer]}.`
        : t("Correct answer information is unavailable.", "የትክክለኛ መልስ መረጃ አልተገኘም።");

    const narration =
      language === "am"
        ? `ጥያቄ ${currentIndex + 1}. ${currentQuestion.text}. ${selectedAnswerText} ${outcomeText} ${correctAnswerText}`
        : `Question ${currentIndex + 1}. ${currentQuestion.text}. ${selectedAnswerText} ${outcomeText} ${correctAnswerText}`;
    void ttsService.speak(narration, language);
  }, [currentIndex, currentQuestion, language]);

  useEffect(() => {
    const load = async () => {
      if (!examId) return;

      try {
        const review = studentId
          ? await getExaminerResultReviewApi(studentId, examId)
          : await getResultReviewApi(examId);
        setExamTitle(review.exam.title);
        setExamSubject(review.exam.subject);
        setQuestions(
          review.questions.map((question) => ({
            id: question.id,
            text: question.text,
            options: question.options,
            selectedOption: question.selectedOption,
            correctAnswer: question.correctAnswer,
            isCorrect: question.isCorrect,
            answeredAt: question.answeredAt,
          })),
        );
      } catch (error) {
        console.error("Failed to load result review", error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [examId]);

  useEffect(() => {
    if (!currentQuestion) return;
    speakCurrentReview();
    return () => ttsService.stop();
  }, [currentQuestion, speakCurrentReview]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!currentQuestion) return;

      if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        speakCurrentReview();
        return;
      }

      if (event.key !== "Enter") return;

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
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        navigate(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, currentQuestion, navigate, questions.length, speakCurrentReview]);

  const handlePageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) {
      return;
    }

    void speakCurrentReview();
  };

  const answeredText = useMemo(() => {
    if (!currentQuestion) return t("Not answered", "አልተመለሰም");
    if (typeof currentQuestion.selectedOption !== "number") return t("Not answered", "አልተመለሰም");

    const optionText = currentQuestion.options[currentQuestion.selectedOption] ?? "";
    return `${String.fromCharCode(65 + currentQuestion.selectedOption)}. ${optionText}`;
  }, [currentQuestion]);

  const correctText = useMemo(() => {
    if (!currentQuestion) return t("N/A", "የለም");
    const optionText = currentQuestion.options[currentQuestion.correctAnswer] ?? "";
    return `${String.fromCharCode(65 + currentQuestion.correctAnswer)}. ${optionText}`;
  }, [currentQuestion, t]);

  if (!user || !["student", "examiner", "admin"].includes(user.role)) {
    return <Navigate to="/login" />;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("Loading exam review...", "የፈተና ግምገማ በመጫን ላይ...")}</div>;
  }

  if (!currentQuestion) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("No review data found for this exam.", "ለዚህ ፈተና የግምገማ መረጃ አልተገኘም።")}
          </p>
          <Button className="mt-4" onClick={() => navigate("/student/results")}>
            {t("Back to Results", "ወደ ውጤቶች ተመለስ")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div onClick={handlePageClick} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">{t("Exam Review", "የፈተና ግምገማ")}</h1>
          <p className="text-sm text-muted-foreground">
            {examTitle}
            {examSubject ? ` • ${examSubject}` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("Back to Results", "ወደ ውጤቶች ተመለስ")}
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg font-display">
              {t("Question", "ጥያቄ")} {currentIndex + 1} {t("of", "ከ")} {questions.length}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={speakCurrentReview}>
              <Volume2 className="mr-2 h-4 w-4" /> {t("Read Again (Alt+R)", "እንደገና አንብብ (Alt+R)")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed">{currentQuestion.text}</p>

          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentQuestion.selectedOption === index;
              const isCorrect = currentQuestion.correctAnswer === index;

              return (
                <div
                  key={`${currentQuestion.id}-${index}`}
                  className={`rounded-lg border p-3 ${isCorrect ? "border-success/40 bg-success/5" : isSelected ? "border-warning/40 bg-warning/5" : "border-border"}`}
                >
                  <p className="text-sm">
                    <span className="font-semibold mr-1">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t("Your Answer", "የእርስዎ መልስ")}</p>
              <p className="text-sm font-medium mt-1">{answeredText}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t("Result", "ውጤት")}</p>
              <p className="text-sm font-medium mt-1">
                {currentQuestion.isCorrect === true
                  ? t("Correct", "ትክክል")
                  : currentQuestion.isCorrect === false
                    ? t("Wrong", "ስህተት")
                    : t("Unanswered", "አልተመለሰም")}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t("Correct Answer", "ትክክለኛ መልስ")}</p>
              <p className="text-sm font-medium mt-1">{correctText}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> {t("Previous", "ቀዳሚ")}
            </Button>
            <Button
              onClick={() => {
                if (currentIndex < questions.length - 1) {
                  setCurrentIndex((prev) => prev + 1);
                } else {
                  navigate("/student/results");
                }
              }}
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  {t("Next", "ቀጣይ")} <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                t("Done", "ጨርስ")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
