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

interface WechatJsonResponse {
    json?: WechatErrorResponse;
}

/**
 * Low-level WeChat API client.
 * Handles token acquisition, retry logic, and error classification.
 * No Notice calls — returns Result types instead.
 */
export class WechatApiClient {
    private logger: Logger;
    private account: WechatAccount;
    private tokenCache: Map<string, TokenCache> = new Map();
    private lastTokenErrorMessage = '';

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

    getLastTokenErrorMessage(): string {
        return this.lastTokenErrorMessage;
    }

    /** Get access token with caching */
    async getAccessToken(forceRefresh = false): Promise<string | null> {
        const cacheKey = this.account.id;
        this.lastTokenErrorMessage = '';

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
                    this.lastTokenErrorMessage = this.getErrorMessage(tokenResponse.json);
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
                this.lastTokenErrorMessage = `网络错误：${error instanceof Error ? error.message : String(error)}`;
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
                if (isTokenExpiredResponse(response)) {
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
            case -1:
                return '微信系统繁忙，请稍候再试。';
            case 0:
                return '请求成功。';
            case 40001:
                return `AppSecret 错误、Access Token 无效或账号不匹配。请检查当前公众号的 App ID 和 App secret。微信返回：${errmsg}`;
            case 40014:
                return `Access Token 无效，请重新测试连接或检查公众号配置。微信返回：${errmsg}`;
            case 42001:
                return `Access Token 已过期，请重试。微信返回：${errmsg}`;
            case 41001:
                return '缺少 access_token 参数，请重试。';
            case 41002:
                return 'App ID 为空，请填写公众号 App ID。';
            case 40002:
                return `凭证类型 grant_type 不合法。微信返回：${errmsg}`;
            case 40013:
                return `App ID 无效，请检查公众号 App ID 是否正确。微信返回：${errmsg}`;
            case 40007:
                return `无效的媒体文件 ID (media_id)，请重新选择封面图。微信返回：${errmsg}`;
            case 40003:
                return `OpenID 无效，请确认用户已关注公众号。微信返回：${errmsg}`;
            case 40005:
                return `上传素材文件格式不正确，请转换图片格式后重试。微信返回：${errmsg}`;
            case 40006:
                return `上传素材文件大小超过限制，请压缩后重试。微信返回：${errmsg}`;
            case 45009:
                return `接口调用超过每日限额，请明天再试。微信返回：${errmsg}`;
            case 45011:
                return `接口调用太频繁，请稍候再试。微信返回：${errmsg}`;
            case 45002:
                return `内容大小超过限制，请减少文章内容或图片后重试。微信返回：${errmsg}`;
            case 48001:
                return `接口功能未授权，请确认公众号已开通相关接口权限。微信返回：${errmsg}`;
            case 48004:
                return `接口被封禁，请登录微信公众平台查看详情。微信返回：${errmsg}`;
            case 40009:
                return `图片尺寸太大或格式不符合要求，请压缩/转换后重试。微信返回：${errmsg}`;
            case 41005:
                return `缺少多媒体文件数据，请检查图片文件是否读取成功。微信返回：${errmsg}`;
            case 40004:
                return `无效的媒体文件类型，请检查图片格式。微信返回：${errmsg}`;
            case 40137:
                return `图片格式不支持，请转换为 bmp/png/jpeg/jpg/gif 后重试。微信返回：${errmsg}`;
            case 40160:
                return `图片文件无效，请重新选择或转换图片后重试。微信返回：${errmsg}`;
            case 40161:
                return `图片文件内容与格式不匹配，请转换图片后重试。微信返回：${errmsg}`;
            case 45001:
                return `多媒体文件大小超过限制，请压缩图片后重试。微信返回：${errmsg}`;
            case 43001:
                return `请求方法错误，需要 GET 请求。微信返回：${errmsg}`;
            case 43002:
                return `请求方法错误，需要 POST 请求。微信返回：${errmsg}`;
            case 43003:
                return `需要 HTTPS 请求。微信返回：${errmsg}`;
            case 50002:
                return `用户受限，可能是账号被冻结或注销。微信返回：${errmsg}`;
            case 61004:
            case 45035:
                return `IP 白名单错误：当前 IP 不在微信公众平台白名单中。请在微信公众平台 → 设置与开发 → 基本配置 → IP 白名单中添加当前 IP。微信返回：${errmsg}`;
            case 40125:
                return `App ID 或 App secret 不合法，请检查大小写、空格和公众号是否匹配。微信返回：${errmsg}`;
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
                let detail = WechatApiClient.formatWechatError({ errcode, errmsg });
                // 附加诊断信息
                if (errcode === 40164) {
                    const ipMatch = errmsg?.match(/\d+\.\d+\.\d+\.\d+/);
                    const ip = ipMatch ? ipMatch[0] : '未知IP';
                    detail = `IP 白名单未配置 — ${errmsg}。请在微信公众平台 → 设置与开发 → 基本配置 → IP 白名单中添加此 IP (${ip})。`;
                } else if (errcode === 40001 || errcode === 40014 || errcode === 42001) {
                    detail = `Access Token 获取失败 — ${errmsg}。请检查 App ID 和 App secret 是否正确，以及 IP 是否在白名单中。`;
                } else if (errcode === 40013) {
                    detail = `App ID 无效 — ${errmsg}。请检查 App ID 是否正确。`;
                } else if (errcode === 41002) {
                    detail = `App ID 为空 — ${errmsg}。请填写 App ID。`;
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

    private static formatWechatError(responseJson: WechatErrorResponse): string {
        return new WechatApiClient(
            { id: '', name: '', appId: '', appSecret: '' },
            { debug: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined },
        ).getErrorMessage(responseJson);
    }
}

function isTokenExpiredResponse(response: unknown): response is WechatJsonResponse {
    const json = (response as WechatJsonResponse | null)?.json;
    return !!json?.errcode && [40001, 40014, 42001].includes(json.errcode);
}
