import type { Express } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { usersRouter } from "../modules/user/user.routes.js";
import { examsRouter } from "../modules/exams/controllers/exams.controller.js";
import { questionsRouter } from "../modules/questions/controllers/questions.controller.js";
import { responsesRouter } from "../modules/responses/controllers/responses.controller.js";
import { resultsRouter } from "../modules/results/controllers/results.controller.js";
import { auditRouter } from "../modules/audit/controllers/audit.controller.js";
import { systemSettingsRouter } from "../modules/system-settings/controllers/system-settings.controller.js";

export function registerRoutes(app: Express) {
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/exams", examsRouter);
  app.use("/api/questions", questionsRouter);
  app.use("/api/responses", responsesRouter);
  app.use("/api/results", resultsRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/system-settings", systemSettingsRouter);
}
