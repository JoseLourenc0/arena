import type { IpBlockRepository } from "../repositories/ip-repository.interface";
import { logger } from "../../../common/logger";

export const migrateIpTracking = async (repo: IpBlockRepository) => {
  logger.info("iptracking_migrate_start");
  const startedAt = Date.now();

  await repo.migrate();

  logger.info("iptracking_migrate_done", {
    durationMs: Date.now() - startedAt,
  });
};
