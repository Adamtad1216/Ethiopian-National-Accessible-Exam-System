import { z } from "zod";

export const createExamDto = z.object({
  title: z.string().min(3),
  titleAmharic: z.string().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  description: z.string().optional(),
  descriptionAmharic: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  duration: z.number().int().min(1),
  autoSubmit: z.boolean().optional(),
  enableTTS: z.boolean().optional(),
  speechRate: z.enum(["slow", "normal", "fast"]).optional(),
  autoRepeat: z.boolean().optional(),
  keyboardNavigation: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  allowReview: z.boolean().optional(),
});

export const updateExamDto = createExamDto.partial();

export type CreateExamDto = z.infer<typeof createExamDto>;
export type UpdateExamDto = z.infer<typeof updateExamDto>;
