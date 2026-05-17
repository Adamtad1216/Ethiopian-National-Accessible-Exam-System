import { Router } from "express";
import { requireAuth, requireRole } from "../../../common/middleware/auth.js";
import { validateBody } from "../../../common/middleware/validate.js";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { logAudit } from "../../audit/services/audit.service.js";
import { createQuestionDto } from "../dtos/question.dto.js";
import * as questionsService from "../services/questions.service.js";

export const questionsRouter = Router();

questionsRouter.get(
  "/exam/:examId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const isStudent = req.authUser!.role === "student";
    const includeAnswers = !isStudent;
    res.json(
      await questionsService.getQuestionsByExam(
        String(req.params.examId),
        includeAnswers,
        isStudent,
      ),
    );
  }),
);

questionsRouter.post(
  "/",
  requireAuth,
  requireRole("examiner", "admin"),
  validateBody(createQuestionDto),
  asyncHandler(async (req, res) => {
    const question = await questionsService.createQuestion(req.body);
    await logAudit(req.authUser!.userId, "question_created", {
      questionId: question.id,
      examId: req.body.examId,
    });
    res.status(201).json(question);
  }),
);
