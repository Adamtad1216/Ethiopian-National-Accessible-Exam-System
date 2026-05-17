import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middlewares/error.middleware.js";
import { registerRoutes } from "./routes/index.js";

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

registerRoutes(app);

app.use(errorHandler);
