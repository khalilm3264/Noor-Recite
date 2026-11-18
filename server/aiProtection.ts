import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const DAY_MS = 24 * 60 * 60 * 1000;

export function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('AI limits must be positive integers.');
  }
  return parsed;
}

/** Per-process hard limits apply to actual provider calls, including retries/fallbacks. */
export class AiCallBudget {
  private used = 0;
  private active = 0;
  private resetsAt: number;

  private readonly dailyLimit: number;
  private readonly concurrencyLimit: number;
  private readonly now: () => number;

  constructor(dailyLimit = 300, concurrencyLimit = 3, now: () => number = Date.now) {
    this.dailyLimit = dailyLimit;
    this.concurrencyLimit = concurrencyLimit;
    this.now = now;
    this.resetsAt = this.now() + DAY_MS;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const now = this.now();
    if (now >= this.resetsAt) {
      this.used = 0;
      this.resetsAt = now + DAY_MS;
    }
    if (this.used >= this.dailyLimit) {
      throw Object.assign(new Error('The daily AI allowance has been reached. Please try again later.'), { status: 429 });
    }
    if (this.active >= this.concurrencyLimit) {
      throw Object.assign(new Error('AI services are busy. Please try again shortly.'), { status: 429 });
    }
    this.used++;
    this.active++;
    try {
      return await operation();
    } finally {
      this.active--;
    }
  }
}

/** Blocks browser cross-site requests; this is not user authentication. */
export function sameOriginOnly(appUrl?: string): RequestHandler {
  const configuredOrigin = appUrl ? new URL(appUrl).origin : undefined;
  return (req, res, next) => {
    const origin = req.get('origin');
    const expectedOrigin = configuredOrigin ?? `${req.protocol}://${req.get('host')}`;
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expectedOrigin)) {
      res.status(403).json({ error: 'Cross-site AI requests are not allowed.' });
      return;
    }
    next();
  };
}

function parseForwardedFor(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const entries = header.split(',');
  for (let i = entries.length - 1; i >= 0; i--) {
    const match = entries[i].match(/(?:^|;)\s*for=(?:"?\[?([^;\],"\s]+)\]?"?)/i);
    if (match?.[1]) {
      const candidate = match[1].trim();
      if (candidate && !candidate.startsWith('_') && candidate.toLowerCase() !== 'unknown') {
        return candidate.replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, '$1');
      }
    }
  }
  return undefined;
}

function resolveClientRateLimitKey(req: Request): string {
  const trustProxy = req.app.get('trust proxy');
  let clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  if (trustProxy && clientIp === req.socket?.remoteAddress) {
    const forwardedIp = parseForwardedFor(req.get('forwarded'));
    if (forwardedIp) {
      clientIp = forwardedIp;
    }
  }
  return ipKeyGenerator(clientIp);
}

export function createAiRequestLimits(perMinute = 30, perDay = 200): RequestHandler[] {
  return [
    rateLimit({
      windowMs: 60_000,
      limit: perMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: resolveClientRateLimitKey,
      message: { error: 'Too many AI requests. Please wait a minute and try again.' },
    }),
    rateLimit({
      windowMs: DAY_MS,
      limit: perDay,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: resolveClientRateLimitKey,
      message: { error: 'Your daily AI request allowance has been reached.' },
    }),
  ];
}
