import type { Pool } from 'pg'
import type { IpBlock, IpBlockRepository, IpLocation } from './ip-repository.interface'

const IP_BLOCK_COLUMNS_PER_ROW = 5

export class PostgresIpBlockRepository implements IpBlockRepository {
  constructor(private readonly pool: Pool) {}

  async migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ip_blocks (
        id bigserial PRIMARY KEY,
        ip_from bigint NOT NULL,
        ip_to bigint NOT NULL,
        country_code text NOT NULL,
        region text NOT NULL,
        city text NOT NULL
      );
    `)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS seed_runs (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_ip_blocks_from ON ip_blocks (ip_from);`)
  }

  async seedApplied(seedName: string) {
    const result = await this.pool.query(
      `SELECT 1 FROM seed_runs WHERE name = $1 LIMIT 1;`,
      [seedName]
    )

    return (result.rowCount ?? 0) > 0
  }

  async markSeedApplied(seedName: string) {
    await this.pool.query(
      `INSERT INTO seed_runs(name) VALUES($1)
       ON CONFLICT (name) DO NOTHING;`,
      [seedName]
    )
  }

  async insertBatch(blocks: IpBlock[]) {
    if (blocks.length === 0) return

    const values: unknown[] = []
    const tuples: string[] = []

    let index = 1

    for (const block of blocks) {
      tuples.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4})`)
      values.push(block.ipFrom, block.ipTo, block.countryCode, block.region, block.city)
      index += IP_BLOCK_COLUMNS_PER_ROW
    }

    await this.pool.query(
      `INSERT INTO ip_blocks (ip_from, ip_to, country_code, region, city)
       VALUES ${tuples.join(',')}`,
      values
    )
  }

  async findById(ipId: number): Promise<IpLocation | null> {
    const result = await this.pool.query(
      `
      SELECT country_code, region, city, ip_to
      FROM ip_blocks
      WHERE ip_from <= $1
      ORDER BY ip_from DESC
      LIMIT 1
      `,
      [ipId]
    )

    if ((result.rowCount ?? 0) === 0) return null

    const row = result.rows[0] as {
      country_code: string
      region: string
      city: string
      ip_to: string | number
    }

    if (Number(row.ip_to) < ipId) return null

    return {
      countryCode: row.country_code,
      region: row.region,
      city: row.city
    }
  }
}
