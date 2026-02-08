import { getLogContext } from "./log-context";

type Level = "debug" | "info" | "warn" | "error";

const levelRank: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL || "info") as Level;
const minRank = levelRank[envLevel] ?? levelRank.info;

const nowIso = () => new Date().toISOString();

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

const format = (
  level: Level,
  event: string,
  meta?: Record<string, unknown>,
) => {
  const ctx = getLogContext();
  const base: Record<string, unknown> = {
    ts: nowIso(),
    level,
    event,
  };

  if (ctx.requestId) base.requestId = ctx.requestId;

  if (!meta) return safeJson(base);
  return safeJson({ ...base, ...meta });
};

const write = (line: string) => {
  process.stdout.write(line + "\n");
};

const enabled = (level: Level) => levelRank[level] >= minRank;

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => {
    if (!enabled("debug")) return;
    write(format("debug", event, meta));
  },
  info: (event: string, meta?: Record<string, unknown>) => {
    if (!enabled("info")) return;
    write(format("info", event, meta));
  },
  warn: (event: string, meta?: Record<string, unknown>) => {
    if (!enabled("warn")) return;
    write(format("warn", event, meta));
  },
  error: (event: string, meta?: Record<string, unknown>) => {
    if (!enabled("error")) return;
    write(format("error", event, meta));
  },
};
