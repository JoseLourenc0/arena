export type IpLocation = {
  countryCode: string;
  region: string;
  city: string;
};

export type IpBlock = IpLocation & {
  ipFrom: number;
  ipTo: number;
};

export interface IpBlockRepository {
  migrate(): Promise<void>;
  seedApplied(name: string): Promise<boolean>;
  markSeedApplied(name: string): Promise<void>;
  insertBatch(rows: IpBlock[]): Promise<void>;
  findById(ipId: number): Promise<IpLocation | null>;
}
