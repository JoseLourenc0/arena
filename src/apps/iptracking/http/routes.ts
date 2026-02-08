import type { Router } from "express";
import { Router as createRouter } from "express";
import type { IpBlockRepository } from "../repositories/ip-repository.interface";
import { createIpTrackingController } from "./controller";

export const ipTrackingRoutes = (repo: IpBlockRepository): Router => {
  const router = createRouter();
  const controller = createIpTrackingController(repo);

  router.get("/ip/location", controller.lookup);

  return router;
};
