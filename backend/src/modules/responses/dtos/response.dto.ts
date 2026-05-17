import { z } from "zod";

export const submitResponseDto = z.object({
  examId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOption: z.number().int().min(0),
  answeredAt: z.string().datetime().optional(),
});

export const syncBatchDto = z.object({
  responses: z.array(submitResponseDto).min(1),
});

export type SubmitResponseDto = z.infer<typeof submitResponseDto>;
