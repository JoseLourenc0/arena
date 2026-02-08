import type { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'
import { withLogContext } from './log-context'

export type RequestWithId = Request & { requestId?: string }

const newId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const requestId = (req: RequestWithId, res: Response, next: NextFunction) => {
  const reqId = req.header('x-request-id')
  const id = typeof reqId === 'string' && reqId.trim() ? reqId.trim() : newId()

  req.requestId = id
  res.setHeader('x-request-id', id)

  withLogContext({ requestId: id }, () => next())
}
