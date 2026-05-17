import { Router } from "express";
import { requireAuth, requireRole } from "../../../common/middleware/auth.js";
import { validateBody } from "../../../common/middleware/validate.js";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import {
  updateSystemSettingsDto,
  type UpdateSystemSettingsDto,
} from "../dtos/system-settings.dto.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../services/system-settings.service.js";

export const systemSettingsRouter = Router();

systemSettingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getSystemSettings());
  }),
);

systemSettingsRouter.put(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(updateSystemSettingsDto),
  asyncHandler(async (req, res) => {
    res.json(await updateSystemSettings(req.body as UpdateSystemSettingsDto));
  }),
);
