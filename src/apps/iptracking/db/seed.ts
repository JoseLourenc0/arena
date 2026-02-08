import fs from "fs";
import readline from "readline";
import zlib from "zlib";
import type {
  IpBlock,
  IpBlockRepository,
} from "../repositories/ip-repository.interface";
import { logger } from "../../../common/logger";

const SEED_NAME = "iptracking:ip_blocks:v1";

const parseTsv = (line: string): IpBlock | null => {
  const [ipFromStr, ipToStr, countryCode, region, city] = line.split("\t");
  if (!ipFromStr || !ipToStr || !countryCode || !region || !city) return null;

  const ipFrom = Number(ipFromStr);
  const ipTo = Number(ipToStr);

  if (!Number.isFinite(ipFrom) || !Number.isFinite(ipTo)) return null;

  return { ipFrom, ipTo, countryCode, region, city };
};

export const seedIpTracking = async (
  repo: IpBlockRepository,
  filePath: string,
) => {
  if (await repo.seedApplied(SEED_NAME)) {
    logger.info("iptracking_seed_skip", { seed: SEED_NAME });
    return;
  }

  logger.info("iptracking_seed_start", { seed: SEED_NAME, filePath });
  const startedAt = Date.now();

  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const BATCH_SIZE = 10_000;

  let batch: IpBlock[] = [];
  let inserted = 0;
  let read = 0;

  const progress = setInterval(() => {
    logger.info("iptracking_seed_progress", { read, inserted });
  }, 2000);

  try {
    for await (const line of rl) {
      read += 1;

      const row = parseTsv(line);
      if (!row) continue;

      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        await repo.insertBatch(batch);
        inserted += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await repo.insertBatch(batch);
      inserted += batch.length;
    }

    await repo.markSeedApplied(SEED_NAME);
  } finally {
    clearInterval(progress);
    rl.close();
  }

  logger.info("iptracking_seed_done", {
    inserted,
    read,
    durationMs: Date.now() - startedAt,
  });
};
