import { z } from "zod";

export const createQuestionDto = z.object({
  examId: z.string().min(1),
  text: z.string().min(2),
  options: z.array(z.string().min(1)).min(2),
  correctAnswer: z.number().int().min(0),
  section: z.string().min(1),
});

export type CreateQuestionDto = z.infer<typeof createQuestionDto>;
