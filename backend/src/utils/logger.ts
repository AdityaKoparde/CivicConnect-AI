/** Minimal structured logger. Never logs request bodies (citizen privacy). */

type Level = 'info' | 'warn' | 'error';

const emit = (level: Level, msg: string, meta?: Record<string, unknown>): void => {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg,
    ...meta,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};
