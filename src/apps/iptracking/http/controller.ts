import type { Request, Response } from "express";
import { logger } from "../../../common/logger";
import type { IpBlockRepository } from "../repositories/ip-repository.interface";
import { lookupIpLocation } from "../use-cases/lookupIpLocation";
import { parseIpQuery } from "./ip-query.dto";

export const createIpTrackingController = (repo: IpBlockRepository) => {
  const lookup = lookupIpLocation(repo);

  return {
    lookup: async (req: Request, res: Response) => {
      try {
        const parsed = parseIpQuery(req.query.ip);

        if (!parsed.ok) {
          res.status(400).json({ error: parsed.error });
          return;
        }

        const { ipId } = parsed.value;

        const location = await lookup(ipId);
        if (!location) {
          res.status(404).json({ error: "Not found" });
          return;
        }

        res.json(location);
      } catch (err) {
        logger.error("iptracking_lookup_failed", { error: String(err) });
        res.status(500).json({ error: "Internal error" });
      }
    },
  };
};
