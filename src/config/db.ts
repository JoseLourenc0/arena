import { Pool } from "pg";

export type Db = {
  pool: Pool;
};

export const createDb = (databaseUrl: string): Db => ({
  pool: new Pool({
    connectionString: databaseUrl,
    max: 10,
  }),
});
