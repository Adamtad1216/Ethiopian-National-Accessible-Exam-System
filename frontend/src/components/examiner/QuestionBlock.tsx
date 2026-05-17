import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Copy } from "lucide-react";

export type Option = { label: string; text: string };

export type Question = {
  id: string;
  questionText: string;
  subject?: string;
  options: Option[];
  correctAnswer: string;
  marks: number;
  accessibilityNote?: string;
};

type QuestionBlockProps = {
  question: Question;
  questionNumber: number;
  onUpdate: (id: string, updatedData: Partial<Question>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  showActions?: boolean;
  subjectOptions?: Array<{ value: string; label: string }>;
};

export default function QuestionBlock({
  question,
  questionNumber,
  onUpdate,
  onDelete,
  onDuplicate,
  showActions = true,
  subjectOptions = [],
}: QuestionBlockProps) {
  return (
    <Card className="shadow-card border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-display">
            Question {questionNumber}
          </CardTitle>
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Duplicate question ${questionNumber}`}
                onClick={() => onDuplicate(question.id)}
              >
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                aria-label={`Delete question ${questionNumber}`}
                onClick={() => onDelete(question.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjectOptions.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor={`question-subject-${question.id}`}>Subject</Label>
            <Select
              value={question.subject ?? ""}
              onValueChange={(value) => onUpdate(question.id, { subject: value })}
            >
              <SelectTrigger id={`question-subject-${question.id}`}>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((subjectOption) => (
                  <SelectItem key={subjectOption.value} value={subjectOption.value}>
                    {subjectOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`question-text-${question.id}`}>Question Text</Label>
          <Textarea
            id={`question-text-${question.id}`}
            value={question.questionText}
            onChange={(e) =>
              onUpdate(question.id, { questionText: e.target.value })
            }
            placeholder="Enter question text"
            aria-describedby={`question-${question.id}-help`}
          />
          <p
            id={`question-${question.id}-help`}
            className="text-xs text-muted-foreground"
          >
            Write the full question clearly so screen readers and TTS can read it in one pass.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Options</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((option) => (
              <div key={option.label} className="space-y-1">
                <Label htmlFor={`question-${question.id}-option-${option.label}`}>
                  Option {option.label}
                </Label>
                <Input
                  id={`question-${question.id}-option-${option.label}`}
                  value={option.text}
                  onChange={(e) => {
                    const nextOptions = question.options.map((current) =>
                      current.label === option.label
                        ? { ...current, text: e.target.value }
                        : current,
                    );
                    onUpdate(question.id, { options: nextOptions });
                  }}
                  placeholder={`Option ${option.label}`}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label>Correct Answer</Label>
          <RadioGroup
            value={question.correctAnswer}
            onValueChange={(value) =>
              onUpdate(question.id, { correctAnswer: value })
            }
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-label={`Select the correct answer for question ${questionNumber}`}
          >
            {question.options.map((option) => {
              const optionId = `question-${question.id}-correct-${option.label}`;
              return (
                <Label
                  key={option.label}
                  htmlFor={optionId}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer"
                >
                  <RadioGroupItem id={optionId} value={option.label} />
                  {option.label}
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`question-marks-${question.id}`}>Marks</Label>
            <Input
              id={`question-marks-${question.id}`}
              type="number"
              min={1}
              value={question.marks}
              onChange={(e) =>
                onUpdate(question.id, {
                  marks: Number(e.target.value) > 0 ? Number(e.target.value) : 1,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`question-note-${question.id}`}>
              Accessibility Note (Optional)
            </Label>
            <Textarea
              id={`question-note-${question.id}`}
              value={question.accessibilityNote ?? ""}
              onChange={(e) =>
                onUpdate(question.id, { accessibilityNote: e.target.value })
              }
              placeholder="Include pronunciation hints or assistive reading context"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
