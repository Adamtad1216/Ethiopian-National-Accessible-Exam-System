import { Card, CardContent } from "@/components/ui/card";
import type { ExamParticipantResultApi } from "@/services/api";

type Participant = ExamParticipantResultApi["participants"][number];

interface ParticipantAnswerCardProps {
  participant: Participant;
}

export default function ParticipantAnswerCard({
  participant,
}: ParticipantAnswerCardProps) {
  const participantName =
    `${participant.student.firstName} ${participant.student.lastName}`.trim() ||
    participant.student.email;

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{participantName}</p>
            <p className="text-xs text-muted-foreground">
              {participant.student.email}
            </p>
          </div>
          <p className="text-sm font-semibold text-primary">
            {participant.score}%
          </p>
        </div>

        <div className="space-y-1">
          {participant.answers.map((answer) => {
            const selected =
              typeof answer.selectedOption === "number"
                ? answer.options[answer.selectedOption]
                : "No answer";
            const correct = answer.options[answer.correctAnswer] ?? "N/A";

            return (
              <div
                key={answer.questionId}
                className={`text-xs rounded-md border px-2 py-1 ${
                  answer.isCorrect === true
                    ? "border-success/40 bg-success/10"
                    : answer.isCorrect === false
                      ? "border-destructive/40 bg-destructive/10"
                      : "border-muted bg-muted/30"
                }`}
              >
                Q{answer.questionNumber}: {selected} (Correct: {correct})
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
