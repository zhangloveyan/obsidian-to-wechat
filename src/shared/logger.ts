/**
 * Logger — factory pattern, not singleton.
 * Filters sensitive data (AppSecret) from debug output.
 */

const SENSITIVE_KEYS = ['appSecret', 'wechatAppSecret', 'secret'];

function sanitize(args: unknown[]): unknown[] {
    return args.map(arg => {
        if (typeof arg !== 'object' || arg === null) return arg;
        try {
            const json = JSON.stringify(arg);
            let sanitized = json;
            for (const key of SENSITIVE_KEYS) {
                sanitized = sanitized.replace(
                    new RegExp(`"${key}"\\s*:\\s*"[^"]*"`, 'gi'),
                    `"${key}":"***"`
                );
            }
            return JSON.parse(sanitized);
        } catch {
            return arg;
        }
    });
}

export function createLogger(debugMode = false) {
    return {
        debug(...args: unknown[]) {
            if (debugMode) console.debug('[DEBUG]', ...sanitize(args));
        },
        info(...args: unknown[]) {
            if (debugMode) console.debug('[INFO]', ...sanitize(args));
        },
        warn(...args: unknown[]) {
            console.warn('[WARN]', ...args);
        },
        error(...args: unknown[]) {
            console.error('[ERROR]', ...args);
        },
    };
}

export type Logger = ReturnType<typeof createLogger>;
