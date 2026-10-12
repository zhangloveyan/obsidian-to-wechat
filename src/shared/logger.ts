import { errorMessage } from './errors';

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
    if (value instanceof Error || typeof value === 'string') return errorMessage(value);
    if (typeof value !== 'object' || value === null) return value;
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.map(item => sanitize(item, seen));
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key, /secret|token|authorization|api.?key/i.test(key) ? '[redacted]' : sanitize(item, seen),
    ]));
}

export function createLogger(debugMode = false) {
    const clean = (args: unknown[]) => args.map(arg => sanitize(arg));
    return {
        debug(...args: unknown[]) { if (debugMode) console.debug('[Wechat]', ...clean(args)); },
        info(...args: unknown[]) { if (debugMode) console.debug('[Wechat]', ...clean(args)); },
        warn(...args: unknown[]) { console.warn('[Wechat]', ...clean(args)); },
        error(...args: unknown[]) { console.error('[Wechat]', ...clean(args)); },
    };
}
export type Logger = ReturnType<typeof createLogger>;
