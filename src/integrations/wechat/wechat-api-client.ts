import { requestUrl } from 'obsidian';
import type { Logger } from '../../shared/logger';
import type { WechatAccount } from '../../features/settings/settings';

interface TokenCache {
    token: string;
    expireTime: number;
}

export interface WechatErrorResponse {
    errcode?: number;
    errmsg?: string;
}

export type WechatRequestFn<T> = (token: string) => Promise<T>;

/**
 * Low-level WeChat API client.
 * Handles token acquisition, retry logic, and error classification.
 * No Notice calls — returns Result types instead.
 */
export class WechatApiClient {
    private logger: Logger;
    private account: WechatAccount;
    private tokenCache: Map<string, TokenCache> = new Map();

    constructor(account: WechatAccount, logger: Logger) {
        this.account = account;
        this.logger = logger;
    }

    /** Update the account config (e.g. after settings change) */
    setAccount(account: WechatAccount) {
        this.account = account;
    }

    getAccountId(): string {
        return this.account.id;
    }

    /** Get access token with caching */
    async getAccessToken(forceRefresh = false): Promise<string | null> {
        const cacheKey = this.account.id;

        if (!forceRefresh) {
            const cached = this.tokenCache.get(cacheKey);
            if (cached && Date.now() < cached.expireTime) {
                this.logger.debug('Using cached access token');
                return cached.token;
            }
        }

        const maxRetries = 3;
        const initialDelay = 1000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = initialDelay * Math.pow(2, attempt - 1);
                    this.logger.warn(`Token fetch retry ${attempt}, waiting ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                this.logger.debug(`Fetching WeChat access token${forceRefresh ? ' (force refresh)' : ''}`);

                const tokenResponse = await requestUrl({
                    url: 'https://api.weixin.qq.com/cgi-bin/stable_token',
                    method: 'POST',
                    body: JSON.stringify({
                        grant_type: 'client_credential',
                        appid: this.account.appId,
                        secret: this.account.appSecret,
                        force_refresh: forceRefresh,
                    }),
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!tokenResponse.json.access_token) {
                    if (attempt === maxRetries) {
                        return null;
                    }
                    continue;
                }

                const accessToken = tokenResponse.json.access_token;
                const expireTime = Date.now() + 6600000; // 110 minutes
                this.tokenCache.set(cacheKey, { token: accessToken, expireTime });

                return accessToken;
            } catch (error: unknown) {
                this.logger.error(`Token fetch network error (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
                if (attempt === maxRetries) return null;
            }
        }

        return null;
    }

    /** Execute a request with token retry wrapper */
    async requestWithTokenRetry<T>(requestFn: WechatRequestFn<T>): Promise<T | null> {
        const maxRetries = 2;
        const initialDelay = 1000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = initialDelay * Math.pow(2, attempt - 1);
                    this.logger.warn(`Request retry ${attempt}, waiting ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const accessToken = await this.getAccessToken();
                if (!accessToken) return null;

                let response = await requestFn(accessToken);

                // Handle token expiry
                if ((response as any).json && [40001, 40014, 42001].includes((response as any).json.errcode)) {
                    this.logger.warn('Token expired, refreshing and retrying...');
                    const newToken = await this.getAccessToken(true);
                    if (newToken) {
                        response = await requestFn(newToken);
                    }
                }

                return response;
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                const isNetworkError = errorMsg.includes('ERR_CONNECTION_CLOSED') || errorMsg.includes('net::');

                if (isNetworkError && attempt < maxRetries) {
                    this.logger.error(`Network error (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
                    continue;
                }

                this.logger.error(`Request failed:`, error);
                throw error;
            }
        }

        return null;
    }

    /** Classify WeChat error and return user-friendly message */
    getErrorMessage(responseJson: WechatErrorResponse): string {
        const errcode = responseJson.errcode;
        const errmsg = responseJson.errmsg || '';

        switch (errcode) {
            case 40001:
            case 40014:
            case 42001:
                return 'Access Token 已过期或无效，请检查配置。';
            case 41002:
                return 'AppID 为空。';
            case 40013:
                return 'AppID 无效。';
            case 40007:
                return '无效的媒体文件 ID (media_id)，请重新选择封面图。';
            case 40003:
                return 'OpenID 无效，请确认用户已关注公众号。';
            case 45009:
                return '接口调用超过限额，请明天再试。';
            case 48001:
                return '接口功能未授权。';
            case 40009:
                return '图片尺寸太大，请压缩后重试。';
            case 41005:
                return '缺少多媒体文件数据。';
            case 40164: {
                const ipMatch = errmsg?.match(/\d+\.\d+\.\d+\.\d+/);
                const ip = ipMatch ? ipMatch[0] : '当前IP';
                return `IP 白名单错误：${ip} 不在微信公众平台白名单中。请在微信公众平台 → 设置与开发 → 基本配置 → IP 白名单中添加此 IP。`;
            }
            default:
                return `微信 API 错误 (${errcode}): ${errmsg}`;
        }
    }

    /** Test connection with given credentials (static, doesn't use instance account) */
    static async testConnection(appId: string, appSecret: string, logger: Logger): Promise<{ ok: boolean; message: string }> {
        try {
            logger.debug('Testing WeChat connection...');
            const tokenResponse = await requestUrl({
                url: 'https://api.weixin.qq.com/cgi-bin/stable_token',
                method: 'POST',
                body: JSON.stringify({
                    grant_type: 'client_credential',
                    appid: appId,
                    secret: appSecret,
                    force_refresh: true,
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!tokenResponse.json.access_token) {
                const errcode = tokenResponse.json.errcode;
                const errmsg = tokenResponse.json.errmsg || 'Unknown error';
                let detail = `微信返回错误 (${errcode}): ${errmsg}`;
                // 附加诊断信息
                if (errcode === 40164) {
                    const ipMatch = errmsg?.match(/\d+\.\d+\.\d+\.\d+/);
                    const ip = ipMatch ? ipMatch[0] : '未知IP';
                    detail = `IP 白名单未配置 — ${errmsg}。请在微信公众平台 → 设置与开发 → 基本配置 → IP 白名单中添加此 IP (${ip})。`;
                } else if (errcode === 40001 || errcode === 40014 || errcode === 42001) {
                    detail = `Access Token 获取失败 — ${errmsg}。请检查 AppID 和 AppSecret 是否正确，以及 IP 是否在白名单中。`;
                } else if (errcode === 40013) {
                    detail = `AppID 无效 — ${errmsg}。请检查 AppID 是否正确。`;
                } else if (errcode === 41002) {
                    detail = `AppID 为空 — ${errmsg}。请填写 AppID。`;
                }
                return { ok: false, message: detail };
            }

            logger.debug('Connection test successful');
            return { ok: true, message: '连接成功！IP 在白名单中，AppID 和 AppSecret 有效。' };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const detail = `网络错误 — ${errorMsg}。请检查网络连接，确认网络可访问微信 API (api.weixin.qq.com)。`;
            logger.error('Connection test network error:', error);
            return { ok: false, message: detail };
        }
    }
}
