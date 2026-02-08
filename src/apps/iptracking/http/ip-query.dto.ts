import { ipToID } from '../domain/ip'

type Ok<T> = { ok: true; value: T }
type Err = { ok: false; error: string }
type Result<T> = Ok<T> | Err

const isOnlyJunk = (value: string) => /^[.\-]+$/.test(value)

export const parseIpQuery = (raw: unknown): Result<{ ip: string; ipId: number }> => {
  if (typeof raw !== 'string') return { ok: false, error: 'Missing ip' }

  const ip = raw.trim()

  if (!ip) return { ok: false, error: 'Missing ip' }
  if (ip.length > 15) return { ok: false, error: 'Invalid ip' }
  if (isOnlyJunk(ip)) return { ok: false, error: 'Invalid ip' }
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return { ok: false, error: 'Invalid ip' }

  const ipId = ipToID(ip)
  if (ipId === null) return { ok: false, error: 'Invalid ip' }

  return { ok: true, value: { ip, ipId } }
}
