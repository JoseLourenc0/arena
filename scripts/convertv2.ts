import fs from 'fs'
import readline from 'readline'
import zlib from 'zlib'
import { once } from 'events'

const inputCsvPath = './IP2LOCATION-LITE-DB11.CSV'
const outputTsvGzPath = './data/ip_blocks.tsv.gz'

type IpBlockRow = {
  ipFrom: number
  ipTo: number
  countryCode: string
  region: string
  city: string
}

const stripQuotes = (value: string) =>
  value.trim().replace(/^"|"$/g, '').replace(/""/g, '"')

const parseCsv = (line: string) => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }

    current += ch
  }

  fields.push(current)
  return fields
}

const parseIpBlockRow = (line: string): IpBlockRow | null => {
  if (!line) return null

  const [ipFromRaw, ipToRaw, countryCodeRaw, _countryNameRaw, regionRaw, cityRaw] =
    parseCsv(line)

  const ipFromText = stripQuotes(ipFromRaw || '')
  const ipToText = stripQuotes(ipToRaw || '')
  const countryCode = stripQuotes(countryCodeRaw || '')
  const region = stripQuotes(regionRaw || '')
  const city = stripQuotes(cityRaw || '')

  if (!ipFromText || !ipToText) return null
  if (!countryCode || countryCode === '-') return null
  if (!region || !city) return null

  const ipFrom = Number(ipFromText)
  const ipTo = Number(ipToText)

  if (!Number.isFinite(ipFrom) || !Number.isFinite(ipTo)) return null

  return { ipFrom, ipTo, countryCode, region, city }
}

const writeLine = async (gzip: zlib.Gzip, line: string) => {
  if (gzip.write(line)) return
  await once(gzip, 'drain')
}

const logProgress = (read: number, written: number, skipped: number) => {
  process.stdout.write(`read=${read} written=${written} skipped=${skipped}\r`)
}

const run = async () => {
  console.log(`Converting CSV -> TSV.GZ`)
  console.log(`in:  ${inputCsvPath}`)
  console.log(`out: ${outputTsvGzPath}`)

  fs.mkdirSync(outputTsvGzPath.split('/').slice(0, -1).join('/') || '.', { recursive: true })

  const csvStream = fs.createReadStream(inputCsvPath, { encoding: 'utf-8' })
  const csvLines = readline.createInterface({ input: csvStream, crlfDelay: Infinity })

  const gzip = zlib.createGzip({ level: 9 })
  const outFile = fs.createWriteStream(outputTsvGzPath)
  gzip.pipe(outFile)

  const startedAt = Date.now()

  let read = 0
  let written = 0
  let skipped = 0

  const timer = setInterval(() => logProgress(read, written, skipped), 1000)

  try {
    for await (const line of csvLines) {
      read += 1

      if (read === 1 && line.includes('IP_FROM') && line.includes('IP_TO')) {
        skipped += 1
        continue
      }

      const row = parseIpBlockRow(line)
      if (!row) {
        skipped += 1
        continue
      }

      await writeLine(
        gzip,
        `${row.ipFrom}\t${row.ipTo}\t${row.countryCode}\t${row.region}\t${row.city}\n`
      )

      written += 1
    }

    gzip.end()
    await once(outFile, 'finish')
  } finally {
    clearInterval(timer)
    csvLines.close()
  }

  const elapsedSec = (Date.now() - startedAt) / 1000
  process.stdout.write('\n')
  console.log(`DONE read=${read} written=${written} skipped=${skipped} elapsed=${elapsedSec.toFixed(2)}s`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
