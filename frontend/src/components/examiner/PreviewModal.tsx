import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import type { Question } from "@/components/examiner/QuestionBlock";

type PreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examTitle: string;
  questions: Question[];
  enableTTS: boolean;
  speechRate: "slow" | "normal" | "fast";
  autoRepeat: boolean;
};

export default function PreviewModal({
  open,
  onOpenChange,
  examTitle,
  questions,
  enableTTS,
  speechRate,
  autoRepeat,
}: PreviewModalProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const previewScript = useMemo(() => {
    if (questions.length === 0) return "No questions added yet.";

    return questions
      .map((question, index) => {
        const subjectLine = question.subject ? `Subject: ${question.subject}. ` : "";
        const optionLines = question.options
          .map((option) => `Option ${option.label}. ${option.text || "Empty option"}.`)
          .join(" ");

        return `Question ${index + 1}. ${subjectLine}${question.questionText || "Question text is empty."} ${optionLines} Correct answer: ${question.correctAnswer || "Not selected"}. Marks: ${question.marks}.`;
      })
      .join(" ");
  }, [questions]);

  const speechRateValue = useMemo(() => {
    if (speechRate === "slow") return 0.8;
    if (speechRate === "fast") return 1.2;
    return 1;
  }, [speechRate]);

  const stopTTS = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    speechRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const startTTS = () => {
    if (!enableTTS) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    stopTTS();
    const utterance = new SpeechSynthesisUtterance(previewScript);
    utterance.rate = speechRateValue;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      if (autoRepeat && open) {
        window.setTimeout(() => {
          if (open) startTTS();
        }, 250);
        return;
      }
      setIsSpeaking(false);
      setIsPaused(false);
      speechRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      speechRef.current = null;
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!isSpeaking) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  useEffect(() => {
    if (!open) {
      stopTTS();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <div className="bg-gradient-to-r from-primary via-primary to-primary/80 px-6 py-5 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Preview Exam</DialogTitle>
            <DialogDescription className="text-primary-foreground/90">
              Screen-reader order + TTS simulation for {examTitle || "Untitled Exam"}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6" aria-live="polite">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">TTS Simulation</span>
                <Badge variant="outline" className="capitalize">
                  {speechRate}
                </Badge>
                {autoRepeat && <Badge variant="outline">Auto-repeat</Badge>}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={startTTS}
                  disabled={!enableTTS || questions.length === 0}
                  aria-label="Play text to speech preview"
                >
                  <Play className="mr-2 h-4 w-4" /> Play
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={togglePause}
                  disabled={!isSpeaking}
                  aria-label={isPaused ? "Resume text to speech" : "Pause text to speech"}
                >
                  <Pause className="mr-2 h-4 w-4" /> {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={stopTTS}
                  disabled={!isSpeaking && !isPaused}
                  aria-label="Stop text to speech"
                >
                  <Square className="mr-2 h-4 w-4" /> Stop
                </Button>
              </div>
            </div>
            {!enableTTS && (
              <p className="mt-2 text-xs text-muted-foreground">
                TTS is currently disabled in Accessibility Settings.
              </p>
            )}
          </div>

          <div className="space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No questions added yet.
            </p>
          )}

          {questions.map((question, index) => (
            <section
              key={question.id}
              className="rounded-xl border bg-card/80 p-4 shadow-sm"
              aria-label={`Preview question ${index + 1}`}
            >
              <p className="text-sm font-semibold">Question {index + 1}</p>
              {question.subject && (
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Subject: {question.subject}
                </p>
              )}
              <p className="mt-1 text-sm">
                {question.questionText || "Question text is empty."}
              </p>

              <div className="mt-3 space-y-1 text-sm">
                {question.options.map((option) => (
                  <p key={option.label}>
                    Option {option.label}: {option.text || "Empty option"}
                  </p>
                ))}
              </div>

              <p className="mt-2 text-sm">
                Correct answer: {question.correctAnswer || "Not selected"}
              </p>
              <p className="text-sm">Marks: {question.marks}</p>
              {question.accessibilityNote && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Accessibility note: {question.accessibilityNote}
                </p>
              )}
            </section>
          ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
