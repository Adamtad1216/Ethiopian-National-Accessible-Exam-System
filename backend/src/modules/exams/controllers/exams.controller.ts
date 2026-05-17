import { Router } from "express";
import { requireAuth, requireRole } from "../../../common/middleware/auth.js";
import { validateBody } from "../../../common/middleware/validate.js";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { logAudit } from "../../audit/services/audit.service.js";
import { createExamDto, updateExamDto } from "../dtos/exam.dto.js";
import * as examsService from "../services/exams.service.js";

export const examsRouter = Router();

examsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await examsService.listExams());
  }),
);

examsRouter.get(
  "/assigned",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (_req, res) => {
    res.json(await examsService.listAssignedExams());
  }),
);

examsRouter.get(
  "/:examId",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await examsService.getExamById(String(req.params.examId)));
  }),
);

examsRouter.post(
  "/",
  requireAuth,
  requireRole("examiner", "admin"),
  validateBody(createExamDto),
  asyncHandler(async (req, res) => {
    const exam = await examsService.createExam({
      ...req.body,
      createdBy: req.authUser!.userId,
    });
    await logAudit(req.authUser!.userId, "exam_created", { examId: exam.id });
    res.status(201).json(exam);
  }),
);

examsRouter.patch(
  "/:examId",
  requireAuth,
  requireRole("examiner", "admin"),
  validateBody(updateExamDto),
  asyncHandler(async (req, res) => {
    const exam = await examsService.updateExam(
      String(req.params.examId),
      req.body,
      {
        userId: req.authUser!.userId,
        role: req.authUser!.role as "admin" | "examiner",
      },
    );
    await logAudit(req.authUser!.userId, "exam_updated", { examId: exam.id });
    res.json(exam);
  }),
);

examsRouter.post(
  "/:examId/request-approval",
  requireAuth,
  requireRole("examiner"),
  asyncHandler(async (req, res) => {
    const exam = await examsService.setStatus(
      String(req.params.examId),
      "pending",
    );
    await logAudit(req.authUser!.userId, "exam_submitted_for_approval", {
      examId: exam.id,
    });
    res.json(exam);
  }),
);

examsRouter.post(
  "/:examId/approve",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const exam = await examsService.setStatus(
      String(req.params.examId),
      "approved",
    );
    await logAudit(req.authUser!.userId, "exam_approved", { examId: exam.id });
    res.json(exam);
  }),
);

examsRouter.post(
  "/:examId/publish",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const exam = await examsService.setStatus(
      String(req.params.examId),
      "published",
    );
    await logAudit(req.authUser!.userId, "exam_published", { examId: exam.id });
    res.json(exam);
  }),
);
