export function errorMessage(error: unknown, secrets: readonly string[] = []): string {
    let message = error instanceof Error ? error.message : typeof error === 'string' ? error : '未知错误';
    for (const secret of secrets) if (secret) message = message.split(secret).join('[redacted]');
    return message
        .replace(/([?&](?:access_token|secret|api_key|key)=)[^&\s]+/gi, '$1[redacted]')
        .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
