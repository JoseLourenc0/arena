import express from "express";
import { env } from "./config/env";
import { createDb } from "./config/db";
import { initIpTracking } from "./apps/iptracking/module";
import { logger } from "./common/logger";
import { httpLogger } from "./common/http-logger";
import { requestId } from "./common/request-id";

const run = async () => {
  logger.info("app_starting", { port: env.port });

  const app = express();

  app.use(requestId);
  app.use(httpLogger);

  const db = createDb(env.databaseUrl);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  await initIpTracking(app, db, env.seedFilePath);

  app.listen(env.port, () => {
    logger.info("app_listening", { port: env.port });
  });
};

run().catch((err) => {
  logger.error("app_crashed", { error: String(err) });
  process.exit(1);
});
