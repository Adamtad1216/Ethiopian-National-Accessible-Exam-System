import { z } from "zod";

export const createUserDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  accountNumber: z.string().trim().min(3).max(64).optional(),
  role: z.enum(["student", "examiner"]),
});

export type CreateUserDto = z.infer<typeof createUserDto>;

export const updateUserDto = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  role: z.enum(["admin", "examiner", "student"]),
  isActive: z.boolean(),
});

export type UpdateUserDto = z.infer<typeof updateUserDto>;
