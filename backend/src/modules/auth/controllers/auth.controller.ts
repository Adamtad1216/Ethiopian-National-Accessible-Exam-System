import { Router } from "express";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { validateBody } from "../../../common/middleware/validate.js";
import { loginDto, refreshDto, registerStudentDto } from "../dtos/auth.dto.js";
import * as authService from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  validateBody(loginDto),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  }),
);

authRouter.post(
  "/register",
  validateBody(registerStudentDto),
  asyncHandler(async (req, res) => {
    const result = await authService.registerStudent(req.body);
    res.status(201).json(result);
  }),
);

authRouter.post(
  "/refresh",
  validateBody(refreshDto),
  asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.json(result);
  }),
);
