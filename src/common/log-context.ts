import { AsyncLocalStorage } from 'node:async_hooks'

type LogContext = { requestId?: string }

export const logContext = new AsyncLocalStorage<LogContext>()

export const withLogContext = (ctx: LogContext, fn: () => void) => {
  logContext.run(ctx, fn)
}

export const getLogContext = () => logContext.getStore() || {}
