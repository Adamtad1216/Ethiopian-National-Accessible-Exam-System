import { Router } from "express";
import { requireAuth, requireRole } from "../../../common/middleware/auth.js";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { listAuditLogs } from "../services/audit.service.js";

export const auditRouter = Router();

auditRouter.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    const logs = await listAuditLogs(limit);
    res.json(logs);
  }),
);
