import type { IpBlockRepository } from "../repositories/ip-repository.interface";

export const lookupIpLocation = (repo: IpBlockRepository) => {
  return async (ipId: number) => {
    return repo.findById(ipId);
  };
};
