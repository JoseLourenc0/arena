# Arena Backend Challenge, Notes on decisions and trade-offs

## Goal I optimized for
The challenge is basically a single lookup endpoint, but the real constraint is performance under load, with low memory usage, and without relying on “load everything into RAM”.

So my focus became:
- constant-ish memory usage (streaming),
- fast lookup path (indexed range search),
- reproducible setup for reviewers (no “exotic infra”),
- clean separation of responsibilities (easy to reason, easy to test).

---

## Dataset observations
The provided dataset is large (millions of rows). Treating it as an in-memory structure or parsing it fully on boot is a no-go.

Two key patterns guided the design:
- each record represents an IP range: `ip_from <= ipId <= ip_to`,
- values like country/region/city repeat a lot across ranges.

---

## Main decisions

### 1) Store data in Postgres (vs keeping the original file)
I decided to persist the dataset in Postgres to avoid:
- file I/O contention under concurrent requests,
- having the API rely on a single file for runtime lookups,
- keeping the original CSV in the final zip (explicitly disallowed).

Postgres is easy for reviewers to run and gives me stable latency with proper indexing.

---

### 2) Create an intermediate artifact instead of shipping the CSV
Because the original CSV cannot be shipped, I generate a compact intermediate file:

- output format: `TSV` (tab-separated) compressed with `gzip`
- file: `data/ip_blocks.tsv.gz`

Why TSV.gz:
- smaller than CSV, usually smaller than JSONL,
- cheap parsing (`split('\t')`),
- perfect for streaming (line-by-line),
- compresses extremely well due to repeated strings.

I wrote a one-off script under `scripts/` that converts the original CSV into this artifact using streaming and backpressure handling, avoiding loading the full input in memory.

---

### 3) Seeding strategy: streaming + batch inserts
Seeding reads `data/ip_blocks.tsv.gz` via `createReadStream -> gunzip -> readline` and inserts using batch inserts.

This keeps memory bounded and is fast enough for the dataset size.

---

### 4) Lookup strategy: range search using index + one extra check
The lookup is a range problem, so it can’t be reduced to a simple primary key lookup.

Current approach:
- query candidate row using: `ip_from <= $1 ORDER BY ip_from DESC LIMIT 1`
- verify `ip_to >= ipId` (otherwise not found)

Index:
- btree on `ip_from`

This gives a very fast and predictable lookup path.

Future improvement if needed:
- use Postgres range types + GiST (`int4range/int8range`) and `@>` operator
- it’s more “correct” for range queries, but current approach already performs well.

---

### 5) Seed runs are versioned (not a single boolean)
Instead of a global `seeded=true`, I track seed steps by name in `seed_runs`.

This makes future evolutions straightforward:
- `iptracking:ip_blocks:v1`
- `iptracking:normalize_locations:v1`
- etc.

So new seeds can be added without breaking old installs.

---

## Code organization choices

### Modules / boundaries
I kept the structure small but explicit:

- `src/main.ts` bootstraps the app
- `src/config/*` env + db (pool)
- `src/apps/iptracking/*` feature module

Inside `iptracking`:
- `domain/` value-level logic (ex: `ipToId`)
- `use-cases/` application logic (orchestration)
- `repositories/` interface + Postgres implementation
- `db/` migrate + seed
- `http/` controller + routes + DTO parsing

This keeps the API layer thin and pushes the “work” into the module.

---

### Input validation
I added a small DTO/parser for the `ip` query param:
- rejects empty, junk-only values like `----` or `....`,
- basic length and format checks,
- conversion to numeric `ipId`.

---

### Logging
I implemented a minimal structured logger (no external libs):
- JSON logs per line
- levels (debug/info/warn/error)
- timestamp included
- request logging middleware includes method, path, status, duration

This makes it easier to understand what happened during migrations/seeds and while running performance tests.

---

## What I explicitly avoided
- Cassandra or other distributed DBs: too much infra complexity for a code challenge, and not necessary to hit the performance target.
- Keeping the original CSV inside the final zip.
- In-memory preloading of the full dataset.

