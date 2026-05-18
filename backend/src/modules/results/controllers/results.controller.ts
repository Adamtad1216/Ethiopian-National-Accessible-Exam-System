import { Router } from "express";
import { requireAuth, requireRole } from "../../../common/middleware/auth.js";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { logAudit } from "../../audit/services/audit.service.js";
import * as resultsService from "../services/results.service.js";

export const resultsRouter = Router();

resultsRouter.get(
  "/",
  requireAuth,
  requireRole("admin", "examiner"),
  asyncHandler(async (_req, res) => {
    const results = await resultsService.getAllResults();
    res.json(results);
  }),
);

resultsRouter.get(
  "/exam/:examId/details",
  requireAuth,
  requireRole("admin", "examiner"),
  asyncHandler(async (req, res) => {
    const details = await resultsService.getExamParticipantResults(
      String(req.params.examId),
      {
        userId: req.authUser!.userId,
        role: req.authUser!.role as "admin" | "examiner",
      },
    );
    res.json(details);
  }),
);

resultsRouter.post(
  "/grade/:examId",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const graded = await resultsService.gradeExamForStudent(
      req.authUser!.userId,
      String(req.params.examId),
    );
    await logAudit(req.authUser!.userId, "exam_graded", {
      examId: String(req.params.examId),
      score: graded.score,
    });
    res.json(graded);
  }),
);

resultsRouter.get(
  "/me/:examId/review",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const review = await resultsService.getResultReviewForStudent(
      req.authUser!.userId,
      String(req.params.examId),
    );
    res.json(review);
  }),
);

resultsRouter.get(
  "/review/:studentId/:examId",
  requireAuth,
  requireRole("admin", "examiner"),
  asyncHandler(async (req, res) => {
    const review = await resultsService.getResultReviewForStudent(
      String(req.params.studentId),
      String(req.params.examId),
    );
    res.json(review);
  }),
);

resultsRouter.get(
  "/me",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const results = await resultsService.getResultsForStudent(
      req.authUser!.userId,
    );
    res.json(results);
  }),
);
