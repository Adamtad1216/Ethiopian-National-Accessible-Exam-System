import { Router } from "express";
import { requireAuth, requireRole } from "../../../common/middleware/auth.js";
import { validateBody } from "../../../common/middleware/validate.js";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { logAudit } from "../../audit/services/audit.service.js";
import { submitResponseDto, syncBatchDto } from "../dtos/response.dto.js";
import * as responsesService from "../services/responses.service.js";

export const responsesRouter = Router();

responsesRouter.post(
  "/",
  requireAuth,
  requireRole("student"),
  validateBody(submitResponseDto),
  asyncHandler(async (req, res) => {
    const result = await responsesService.upsertResponse({
      userId: req.authUser!.userId,
      ...req.body,
    });
    await logAudit(req.authUser!.userId, "response_submitted", {
      examId: req.body.examId,
      questionId: req.body.questionId,
      ignored: result.ignored,
    });
    res.json(result);
  }),
);

responsesRouter.post(
  "/sync",
  requireAuth,
  requireRole("student"),
  validateBody(syncBatchDto),
  asyncHandler(async (req, res) => {
    const synced = await responsesService.syncBatch(
      req.authUser!.userId,
      req.body.responses,
    );
    await logAudit(req.authUser!.userId, "response_batch_synced", {
      count: synced.length,
    });
    res.json({ synced });
  }),
);
