import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "./errorHandler.js";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new ApiError(
          400,
          parsed.error.issues.map((issue) => issue.message).join(", "),
        ),
      );
      return;
    }

    req.body = parsed.data;
    next();
  };
}
