import { requestUrl, type RequestUrlParam, type RequestUrlResponse } from 'obsidian';
import type { WechatAccount } from '../../features/settings/settings';
import type { Logger } from '../../shared/logger';
import { errorMessage, isRecord } from '../../shared/errors';
import { wechatErrorMessage } from './wechat-errors';

export type WechatTransport = (request: RequestUrlParam) => Promise<RequestUrlResponse>;
interface Token { value: string; expiresAt: number }
const API_ROOT = 'https://api.weixin.qq.com';
const EXPIRED = new Set([40001, 40014, 42001]);

export class WechatApiClient {
    readonly account: Readonly<WechatAccount>;
    private token?: Token;
    private tokenRequest?: Promise<string>;

    constructor(account: WechatAccount, private logger: Logger, private transport: WechatTransport = requestUrl) {
        this.account = Object.freeze({ ...account });
    }

    async request(path: string, options: Omit<RequestUrlParam, 'url'>, operation: string): Promise<Record<string, unknown>> {
        let token = await this.getAccessToken();
        for (let attempt = 0; attempt < 2; attempt++) {
            const url = API_ROOT + path + (path.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(token);
            const response = await this.send({ ...options, url }, operation);
            const code = typeof response.errcode === 'number' ? response.errcode : 0;
            if (!code) return response;
            if (EXPIRED.has(code) && attempt === 0) {
                if (this.token && this.token.value !== token && Date.now() < this.token.expiresAt) token = this.token.value;
                else {
                    this.token = undefined;
                    token = await this.getAccessToken(true);
                }
                continue;
            }
            throw new Error(operation + '失败（微信错误 ' + code + '）：' + wechatErrorMessage({
                errcode: code, errmsg: typeof response.errmsg === 'string' ? this.redact(response.errmsg) : '',
            }));
        }
        throw new Error(operation + '失败：凭证刷新后仍不可用。');
    }

    async getAccessToken(force = false): Promise<string> {
        if (!force && this.token && Date.now() < this.token.expiresAt) return this.token.value;
        if (this.tokenRequest) return this.tokenRequest;
        const pending = this.fetchToken(force);
        this.tokenRequest = pending;
        try { return await pending; }
        finally { if (this.tokenRequest === pending) this.tokenRequest = undefined; }
    }

    private async fetchToken(force: boolean): Promise<string> {
        const result = await this.send({
            url: API_ROOT + '/cgi-bin/stable_token', method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grant_type: 'client_credential', appid: this.account.appId.trim(), secret: this.account.appSecret.trim(), force_refresh: force }),
        }, '获取公众号凭证');
        if (typeof result.access_token !== 'string' || !result.access_token) {
            throw new Error('获取公众号凭证失败（微信错误 ' + (typeof result.errcode === 'number' ? result.errcode : '未知') + '）：' + wechatErrorMessage({
                errcode: typeof result.errcode === 'number' ? result.errcode : undefined,
                errmsg: typeof result.errmsg === 'string' ? this.redact(result.errmsg) : '缺少 access_token',
            }));
        }
        const seconds = typeof result.expires_in === 'number' && result.expires_in > 0 ? result.expires_in : 7200;
        this.token = { value: result.access_token, expiresAt: Date.now() + Math.max(1, seconds - Math.min(300, seconds / 10)) * 1000 };
        return result.access_token;
    }

    private async send(options: RequestUrlParam, operation: string): Promise<Record<string, unknown>> {
        let response: RequestUrlResponse;
        try { response = await this.transport({ ...options, throw: false }); }
        catch (error) {
            const detail = this.redact(error);
            this.logger.warn(operation + '网络请求失败：' + detail);
            throw new Error(operation + '网络请求失败：' + detail + '。若请求已发送，请先检查微信端结果再重试。');
        }
        let payload: unknown;
        try { payload = JSON.parse(response.text); }
        catch { throw new Error(operation + '失败：HTTP ' + response.status + '，响应不是有效 JSON。'); }
        if (!isRecord(payload)) throw new Error(operation + '失败：响应格式异常。');
        if ('errcode' in payload && typeof payload.errcode !== 'number') throw new Error(operation + '失败：微信 errcode 格式异常。');
        if (response.status < 200 || response.status >= 300) {
            const detail = typeof payload.errmsg === 'string' ? this.redact(payload.errmsg) : '';
            throw new Error(operation + '失败：HTTP ' + response.status + (detail ? '，' + detail : ''));
        }
        return payload;
    }

    private redact(error: unknown): string {
        return errorMessage(error, [this.account.appSecret, this.token?.value || '']);
    }

    static async testConnection(appId: string, appSecret: string, logger: Logger): Promise<{ ok: boolean; message: string }> {
        try {
            const client = new WechatApiClient({ id: 'connection-test', name: '', appId, appSecret }, logger);
            await client.getAccessToken();
            return { ok: true, message: '连接成功，公众号凭证和 IP 白名单有效。' };
        } catch (error) { return { ok: false, message: errorMessage(error) }; }
    }
}
