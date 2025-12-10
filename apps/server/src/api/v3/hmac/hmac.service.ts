import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import { InjectModel } from '@nestjs/sequelize';
import { SdkApiKey } from '@/model/entities/sdk/sdk-api-key.entity';

@Injectable()
export class HmacService {
  private rsaKeys: Map<string, string> = new Map(); // apiKey -> privateRsaKey
  constructor(
    @InjectModel(SdkApiKey)
    private sdkApiKeyRepository: typeof SdkApiKey,
  ) {
    setTimeout(() => {
      this.loadRsaKeys().then((res) => {
        // this.test();
      });
    }, 500);

    // this.encryptAESMessage(
    //   'c36ade2585bcc34ced48841f9a27cbd2',
    //   'password=123456&username=slider',
    // );
    // this.decryptAESMessage(
    //   'c36ade2585bcc34ced48841f9a27cbd2',
    //   'U2FsdGVkX18aj0H+ydWdyTcU58AccaQ4rFdEzTPIogx00Zo0fizz8AZfQPKYe+xu',
    // );
  }

  test() {
    //original rsa key
    //     const publicRSAKey = `-----BEGIN RSA PUBLIC KEY-----
    // MIGJAoGBAMVIr9vcisBxXMVI9Gs6VgcQ6RKa3NiU8GXDEUIg5v9fDg6Oc1h96HhS
    // +7TtPpaDtKPnU2NJ7jok3+loO6RVWl3to/Of5J2ba/d150apVdINRyP9HTLLGOVK
    // r4ctBTEJzgr8w7QjHMCsRWo180DXAXx3gtqPxAid9afhnxxgkKmjAgMBAAE=
    // -----END RSA PUBLIC KEY-----
    // `;
    //     const privateRSAKey = `-----BEGIN PRIVATE KEY-----
    // MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAMVIr9vcisBxXMVI
    // 9Gs6VgcQ6RKa3NiU8GXDEUIg5v9fDg6Oc1h96HhS+7TtPpaDtKPnU2NJ7jok3+lo
    // O6RVWl3to/Of5J2ba/d150apVdINRyP9HTLLGOVKr4ctBTEJzgr8w7QjHMCsRWo1
    // 80DXAXx3gtqPxAid9afhnxxgkKmjAgMBAAECgYApS3u0E8ffXFtE2G6A+2cCd6Gx
    // yUSs+RAQ3PIB240+qxDwLxUp0sEUXppdVsOhEdR/8m3b/J+nAAz2eGDzlwIhBJI6
    // OBuy8Sktups4rVQ1y3y/etR/iUERAayyxx0YvHqMqCzWZv6XXMOXFTvmBTmXec9g
    // 5IswBamFbtUvaklscQJBAPfkOnY2FBR4KB7FhWEVUaSEvGuFpQ8KW8zrW4/157oX
    // 6dmBT2VdCXEUua91BVoFDvmEwipyd/9GgN3Q1oia+68CQQDLvK9z2DUpHpph+aVa
    // rE6zSKNeT3A3b6WxnR8wOj+KZZogSG3Z6M1NH/i6/RITZ+fPwHYnNhWfvN3t7D0e
    // q+pNAkEA2A7rSZcO31xvE4rzGs/7DdrHYyvj1n0f0Dae4pXg+BjZsML9EYsKrK30
    // vdHP7UsVZzNoDJkir7OipDLemcgDbwJANz+XpKaA5AG0g9UbDhejz+JmyvBn0eCo
    // 4h1lk8J38KPUw+RgRbNn2P5OiQaPnEuVBTV/1OpJuuOQmzBw8pxUEQJAHSd1fxho
    // k4KQb4dkizzW6l+4tF4Pss/j8DrXKt+XRCc3LFanmCUoYENaWyHVk+3MAodwKtmr
    // FuQ23C8RNUHP0g==
    // -----END PRIVATE KEY-----
    // `;

    // New RSA Key
    const publicRSAKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDamiKo8Jtix8B0Zb1NxQi0ZN1a
53dhInqjfaz9SYL9/1B3M7YG41kQem0TCbD7BAUXKbPCClTAPVs6tW6A8T8sk/jm
tdM8LCQQQf7xdlmcN90IhV43qcWCLwLkv135piSNWUfTaXR34q3smr1Q0Xoo+bqA
9KBzH48n+kXDNhBfwwIDAQAB
-----END PUBLIC KEY-----`;
    const privateRSAKey = `-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBANqaIqjwm2LHwHRl
vU3FCLRk3Vrnd2EieqN9rP1Jgv3/UHcztgbjWRB6bRMJsPsEBRcps8IKVMA9Wzq1
boDxPyyT+Oa10zwsJBBB/vF2WZw33QiFXjepxYIvAuS/XfmmJI1ZR9NpdHfireya
vVDReij5uoD0oHMfjyf6RcM2EF/DAgMBAAECgYEAoc7BpQckHUP6Iq5EJ1KXFOAs
MONwLAgXevjFmV5Whaf8aZ9vNz4FaPsVzae4xrS9B94oXpLDFODVrGkreGoZ9Yif
639AeSeEWvt3X+XKDfPC+pp0bCUX92jF8w9a6IuxLInShdGy8Oj0aFXM2IfJEwkX
QWv37+hvZaQiAET5RkECQQD4Bq8bwjOEMhyBDzQ+o5HaN0uXUIpK7nIf9ZbrnxDY
hHAtf322za+1SX9BKutVzp+BZB80u7wNPdFiOR7gr2DzAkEA4aFI0hRd7RRxFDsc
wve+Z+bImy83Yk0nl2t47Mf/UssZ76Mkex7Ag+lNQ1Z6BNQFEr+jsBNYfZDgR7s4
4iA58QJAcJT4Hy2DnNnyPlLccCJnLhozYbfZTjH187PSkZleWCmlkcFxGu06eJun
+7izoftsQ5ti3tjof0o0JNWwwmRZKQJAOdXc07TSyrWlsrjgS32zufBnVZgJy1HZ
py+uRIuTgAZ9tHaOIF0mnemMm4ksJ9atIjwrWjPrR+x+AQUVtKjsEQJABVly8Kvw
UzTqDE9TJjhjq9AD+TDNGbepgtJph2RBIJ3hBzgThWOH2cjRhc3ttaTQ/lqtbnvl
MqSp8fx3zBLBLg==
-----END PRIVATE KEY-----
`;
    const data = {
      username: 'slider',
      password: '123456',
    };
    const signedStr = this.generateSignStr(data);
    const aesKey = this.createAESKey();
    console.log('aesKey ', aesKey);
    const aesKeyEncrypted = this.encryptRSAData(publicRSAKey, aesKey);
    const aesKeysDecrypted = this.decryptRSAData(
      privateRSAKey,
      aesKeyEncrypted,
    );
    const signature = this.generateHmac(aesKey, signedStr);
    const encryptData = this.encryptAESMessage(aesKey, JSON.stringify(data));
    console.log('publicRSAKey ', publicRSAKey);
    console.log('x-signature ', signature);
    console.log('x-nonce ', new Date().getTime() + '');
    console.log('x-timestamp ', new Date().getTime() + '');
    console.log('x-encryption ', false);
    console.log('x-encryptKey ', aesKeyEncrypted);
    console.log('signedStr ', signedStr);
    console.log('request body ', data);
    console.log('request encryptData ', encryptData);
    console.log(
      'aesKey',
      aesKey,
      ', aesKeyEncrypted ',
      aesKeyEncrypted,
      ' aesKeysDecrypted',
      aesKeysDecrypted,
    );
  }

  async loadRsaKeys() {
    const apis = await this.sdkApiKeyRepository.findAll();
    for (const api of apis) {
      this.rsaKeys.set(api.key, api.rsaPrivateKey);
    }

    // 為測試API密鑰確保有正確的密鑰對
    await this.ensureTestApiKeyPair();
  }

  private async ensureTestApiKeyPair() {
    const testApiKey = '0394ad1f-260c-4422-99f5-64383606a201';
    const testPrivateKey = `-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBANqaIqjwm2LHwHRl
vU3FCLRk3Vrnd2EieqN9rP1Jgv3/UHcztgbjWRB6bRMJsPsEBRcps8IKVMA9Wzq1
boDxPyyT+Oa10zwsJBBB/vF2WZw33QiFXjepxYIvAuS/XfmmJI1ZR9NpdHfireya
vVDReij5uoD0oHMfjyf6RcM2EF/DAgMBAAECgYEAoc7BpQckHUP6Iq5EJ1KXFOAs
MONwLAgXevjFmV5Whaf8aZ9vNz4FaPsVzae4xrS9B94oXpLDFODVrGkreGoZ9Yif
639AeSeEWvt3X+XKDfPC+pp0bCUX92jF8w9a6IuxLInShdGy8Oj0aFXM2IfJEwkX
QWv37+hvZaQiAET5RkECQQD4Bq8bwjOEMhyBDzQ+o5HaN0uXUIpK7nIf9ZbrnxDY
hHAtf322za+1SX9BKutVzp+BZB80u7wNPdFiOR7gr2DzAkEA4aFI0hRd7RRxFDsc
wve+Z+bImy83Yk0nl2t47Mf/UssZ76Mkex7Ag+lNQ1Z6BNQFEr+jsBNYfZDgR7s4
4iA58QJAcJT4Hy2DnNnyPlLccCJnLhozYbfZTjH187PSkZleWCmlkcFxGu06eJun
+7izoftsQ5ti3tjof0o0JNWwwmRZKQJAOdXc07TSyrWlsrjgS32zufBnVZgJy1HZ
py+uRIuTgAZ9tHaOIF0mnemMm4ksJ9atIjwrWjPrR+x+AQUVtKjsEQJABVly8Kvw
UzTqDE9TJjhjq9AD+TDNGbepgtJph2RBIJ3hBzgThWOH2cjRhc3ttaTQ/lqtbnvl
MqSp8fx3zBLBLg==
-----END PRIVATE KEY-----`;
    const testPublicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDamiKo8Jtix8B0Zb1NxQi0ZN1a
53dhInqjfaz9SYL9/1B3M7YG41kQem0TCbD7BAUXKbPCClTAPVs6tW6A8T8sk/jm
tdM8LCQQQf7xdlmcN90IhV43qcWCLwLkv135piSNWUfTaXR34q3smr1Q0Xoo+bqA
9KBzH48n+kXDNhBfwwIDAQAB
-----END PUBLIC KEY-----`;

    try {
      // 查找是否存在該API密鑰
      const existingApiKey = await this.sdkApiKeyRepository.findOne({
        where: { key: testApiKey },
      });

      if (existingApiKey) {
        // 更新現有記錄的RSA密鑰
        await existingApiKey.update({
          rsaPrivateKey: testPrivateKey,
          rsaPublicKey: testPublicKey,
        });
      } else {
        // 創建新的API密鑰記錄
        await this.sdkApiKeyRepository.create({
          id: testApiKey,
          accountId: 'test-account',
          partner: 'test',
          key: testApiKey,
          rsaPrivateKey: testPrivateKey,
          rsaPublicKey: testPublicKey,
          env: 'dev',
          domains: ['localhost', '127.0.0.1'],
          whiteIps: ['127.0.0.1', '::1'],
          enabled: true,
          bandwidth: 1024,
        });
      }

      // 更新內存中的密鑰映射
      this.rsaKeys.set(testApiKey, testPrivateKey);
    } catch (error) {
      console.error('Error ensuring test API key pair:', error);
    }
  }

  // // 生成 HMAC
  generateHmac(aesKey: string, message: string): string {
    const hmac = crypto.createHmac('sha256', aesKey);
    hmac.update(message);
    const signature = hmac.digest('hex');

    return signature;
  }
  //
  // // 验证 HMAC
  // verifyHmac(apikey: string, body: any, hmacToVerify: string): boolean {
  //   if (body) {
  //     const signStr = this.generateSignStr(body);
  //     const generatedHmac = this.generateHmac(signStr);
  //     return generatedHmac === hmacToVerify;
  //   }
  //   return true;
  // }

  generateSignStr(data: any) {
    let signStr = '';

    const isJsonObject = (data: any) => {
      // 判断是否为 JSON 对象（普通对象）
      return typeof data === 'object' && data !== null && !Array.isArray(data);
    };

    if (typeof data === 'string' && !data.endsWith('==')) {
      // string
      signStr = data;
    } else if (isJsonObject(data)) {
      // 判断是否为 JSON 对象（普通对象）
      signStr = Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join('&');
    } else if (Array.isArray(data)) {
      // array items
      signStr = data.reduce((acc, item, idx) => {
        const itemStr = Object.keys(item)
          .sort()
          .map((key) => `${key}=${item[key]}`)
          .join('&');
        return idx === 0 ? itemStr : `${acc}&${itemStr}`;
      }, '');
    } else {
      signStr = data?.toString();
    }

    return signStr;
  }

  verifySignature(
    apiKey: string,
    encryptKey: string,
    body: any,
    signature: string,
  ) {
    const rsaKey = this.rsaKeys.get(apiKey);
    if (!rsaKey) {
      throw new Error('Rsa Key undefined');
    }
    const signedStr = this.generateSignStr(body);
    const aesKeyDecrypted = this.decryptRSAData(rsaKey, encryptKey);
    const dataSigned = this.generateHmac(aesKeyDecrypted, signedStr);

    return dataSigned === signature;
  }

  createAESKey() {
    // 生成 AES-256 密钥
    const key = crypto.generateKeySync('aes', { length: 128 }); // 128, 192, or 256
    return key.export().toString('hex');
  }

  parseRequestData(apiKey: string, encryptKey: string, message: string) {
    const rsaKey = this.rsaKeys.get(apiKey);

    if (!rsaKey) {
      console.error(`RSA private key not found for API Key: ${apiKey}`);
      throw new Error(`RSA private key not found for API Key: ${apiKey}`);
    }

    try {
      const aesKeysDecrypted = this.decryptRSAData(rsaKey, encryptKey);

      const dataStr = this.decryptAESMessage(aesKeysDecrypted, message);

      return dataStr;
    } catch (error) {
      console.error('Error in parseRequestData:', error);
      throw error;
    }
  }

  // AES 加密
  encryptAESMessage(aesKey: string, message: string): string {
    const encrypted = CryptoJS.AES.encrypt(message, aesKey).toString();

    return encrypted;
  }

  // AES 解密
  decryptAESMessage(aesKey: string, encryptedMessage: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, aesKey);
    const data = bytes.toString(CryptoJS.enc.Utf8);

    return data; // 返回解密后的明文
  }

  decryptRSAData(privateKey: string, encryptedData: string) {
    const buffer = Buffer.from(encryptedData, 'base64');

    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING, // 關鍵：PKCS#1
        },
        buffer,
      );

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('RSA decryption failed:', error.message);
      throw error;
    }
  }

  encryptRSAData(publicKey: string, data: string) {
    const buffer = Buffer.from(data);
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING, // ✅ 改為 OAEP
        oaepHash: 'sha1', // ✅ 與前端匹配
      },
      buffer,
    );
    return encrypted.toString('base64'); // 返回 Base64 编码的密文
  }
}
