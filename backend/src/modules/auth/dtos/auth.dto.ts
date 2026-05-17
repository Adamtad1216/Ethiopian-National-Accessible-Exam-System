import { z } from "zod";

export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshDto = z.object({
  refreshToken: z.string().min(10),
});

export const registerStudentDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  accountNumber: z.string().trim().min(3).max(64).optional(),
});

export type LoginDto = z.infer<typeof loginDto>;
export type RefreshDto = z.infer<typeof refreshDto>;
export type RegisterStudentDto = z.infer<typeof registerStudentDto>;
