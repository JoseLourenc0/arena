import type { Express } from "express";
import type { Db } from "../../config/db";
import { PostgresIpBlockRepository } from "./repositories/ip-repository";
import { ipTrackingRoutes } from "./http/routes";
import { migrateIpTracking } from "./db/migrate";
import { seedIpTracking } from "./db/seed";

export const initIpTracking = async (
  app: Express,
  db: Db,
  seedFilePath: string,
) => {
  const repo = new PostgresIpBlockRepository(db.pool);

  await migrateIpTracking(repo);
  await seedIpTracking(repo, seedFilePath);

  app.use(ipTrackingRoutes(repo));
};
