import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SdkApiKey } from '@/model/entities/sdk/sdk-api-key.entity';
import { Address4, Address6 } from 'ip-address';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { jsonToUrlParam } from '@/common/utils/utils.pure';

@Injectable()
export class SdkApiKeyService {
  public apiKeys = new Map<string, { id: string; enabled: boolean }>();
  public keyIdMap = new Map<string, string>();
  public whitePaths: Map<RegExp, boolean> = new Map();
  private _whitePaths = [
    /^\/api\/v3\/accounts-gp\/paymaster-checker$/,
    /^\/api\/v3\/accounts-gp\/paymaster-checker-plus$/,
    /^\/api\/v3\/sdk\/external\/galxe\/trade-checker$/,
    /^\/api\/v3\/sdk\/external\/galxe\/listing-checker$/,
    /^\/api\/v3\/auth\/discord$/,
    /^\/api\/v3\/auth\/discord\/callback$/,
    /^\/api\/v3\/auth\/twitter\/callback$/,

    /^\/api\/v3\/biru\/discord$/,
    /^\/api\/v3\/biru\/discord\/callback$/,
    /^\/health$/,
    /^\/api\/v3\/studio\/contracts\/[^/]+\/[^/]+$/,
  ];

  public whiteIps: Map<string, boolean> = new Map();

  constructor(
    @InjectModel(SdkApiKey)
    private sdkApiKeyRepository: typeof SdkApiKey,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    setTimeout(() => {
      this.loadSdkApiKeys().then(() => {});
    }, 500);

    for (const path of this._whitePaths) {
      this.whitePaths.set(path, true);
    }
  }

  async loadSdkApiKeys() {
    const apis = await this.sdkApiKeyRepository.findAll();
    for (const api of apis) {
      if (api.enabled) {
        for (const domain of api.domains) {
          this.apiKeys.set(`${this._getWrapApiKey(api.key, domain)}`, {
            id: api.id,
            enabled: api.enabled,
          });
          this.keyIdMap.set(api.key, api.id);
        }
        for (const ip of api.whiteIps) {
          try {
            // 标准化 IP 地址格式（如果是 CIDR 格式）
            if (ip.includes(':')) {
              new Address6(ip); // 验证 IPv6 格式
            } else {
              new Address4(ip); // 验证 IPv4 格式
            }
            this.whiteIps.set(ip, true);
          } catch (e) {
            console.error(`Invalid IP in whitelist: ${ip}`, e);
          }
        }
      }
    }
    // await this._loadPlusApiKeys();
  }

  async _loadPlusApiKeys() {
    try {
      let url = this.configService.get('LOOTEX_PLUS_API_KEYS_URL');
      const params = {
        simple: true,
        status: 'active',
        environment: process.env.NODE_ENV,
      };
      url = `${url}?${jsonToUrlParam(params)}`;
      // console.log(`data , ${url}`);
      const res = await firstValueFrom(this.httpService.get(url));
      // console.log('data ', res.data);
      if (res.status <= 299 && res.status >= 200) {
        for (const item of res.data) {
          const itemId = (item as any).id;
          const apiKey = (item as any).rawKey;
          const domains = item.domains?.split(',') ?? []; // domains could be null
          // const domains = process.env.FRONTEND_BASE_URL.replace(
          //   /^https?:\/\//,
          //   '',
          // );
          for (const domain of domains) {
            this.apiKeys.set(`${this._getWrapApiKey(apiKey, domain)}`, {
              id: itemId,
              enabled: true,
            });
          }
          this.keyIdMap.set(apiKey, itemId);
        }
      }
    } catch (e) {
      console.error('Error loading Plus API keys:', e);
    }
  }

  _getWrapApiKey(apiKey: string, domain: string) {
    return `${domain}-${apiKey}`;
  }

  _getKeyId(apiKey: string) {
    return this.keyIdMap.get(apiKey) ?? null;
  }

  validateApiKey(apiKey: string, domain: string) {
    return this.apiKeys.has(this._getWrapApiKey(apiKey, domain));
  }

  isWhitePath(path: string): boolean {
    return Array.from(this.whitePaths.keys()).some((pattern) =>
      pattern.test(path),
    );
  }

  isWhiteIp(ip: string): boolean {
    if (!ip) return false;

    try {
      // 检查是否是 IPv6 地址
      if (ip.includes(':')) {
        const ipv6 = new Address6(ip);

        // 遍历白名单检查匹配
        for (const [whiteIp] of this.whiteIps) {
          if (whiteIp.includes(':')) {
            try {
              const whiteIpv6 = new Address6(whiteIp);

              // 如果白名单地址包含 CIDR（如 /64），使用 isInSubnet
              if (whiteIp.includes('/')) {
                if (ipv6.isInSubnet(whiteIpv6)) {
                  return true;
                }
              } else {
                // 完整地址匹配
                if (ipv6.canonicalForm() === whiteIpv6.canonicalForm()) {
                  return true;
                }
              }
            } catch (e) {
              console.error(`无效的 IPv6 白名单地址: ${whiteIp}`, e);
            }
          }
        }
      } else {
        // IPv4 处理
        const ipv4 = new Address4(ip);

        for (const [whiteIp] of this.whiteIps) {
          if (!whiteIp.includes(':')) {
            try {
              const whiteIpv4 = new Address4(whiteIp);
              if (whiteIp.includes('/')) {
                if (ipv4.isInSubnet(whiteIpv4)) {
                  return true;
                }
              } else {
                if (ip === whiteIp) {
                  return true;
                }
              }
            } catch (e) {
              console.error(`无效的 IPv4 白名单地址: ${whiteIp}`, e);
            }
          }
        }
      }
    } catch (e) {
      console.error(`无效的 IP 地址: ${ip}`, e);
    }

    return false;
  }

  /**
   * 获取指定 API key 的 ID
   * @param apiKey API key
   * @returns {string | null} 返回对应的 ID 或 null
   */
  getIdByKey(apiKey: string): string | null {
    const keyId = this._getKeyId(apiKey);
    return keyId || null;
  }
}
