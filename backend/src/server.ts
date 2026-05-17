import { app } from "./app.js";
import { connectDb } from "./database/index.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { finalizeEndedPublishedExams } from "./modules/exams/services/exams.service.js";

function listenOnPort(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    const onError = (error: NodeJS.ErrnoException) => {
      server.off("listening", onListening);
      reject(error);
    };

    server.once("listening", onListening);
    server.once("error", onError);
  });
}

async function bootstrap(): Promise<void> {
  await connectDb();

  // Periodically close ended exams and publish participant results.
  setInterval(() => {
    void finalizeEndedPublishedExams().catch((error) => {
      logger.error("Failed to finalize ended exams", error);
    });
  }, 30_000);

  try {
    await listenOnPort(env.PORT);
    logger.info(`ENAES backend listening on port ${env.PORT}`);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "EADDRINUSE") {
      throw new Error(
        `Port ${env.PORT} is already in use. Stop the existing process on that port or change backend PORT and frontend VITE_API_BASE_URL to the same port.`,
      );
    }

    throw error;
  }
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
