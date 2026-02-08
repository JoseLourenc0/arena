export type Env = {
  port: number;
  databaseUrl: string;
  seedFilePath: string;
};

export const env: Env = {
  port: Number(process.env.PORT || 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/postgres",
  seedFilePath: process.env.SEED_FILE_PATH || "./data/ip_blocks.tsv.gz",
};
