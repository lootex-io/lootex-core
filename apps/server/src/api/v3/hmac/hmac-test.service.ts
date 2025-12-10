import { Injectable } from '@nestjs/common';
import { HmacService } from '@/api/v3/hmac/hmac.service';

@Injectable()
export class HmacTestService {
  constructor(private hmacService: HmacService) {}
  signIn(dto: { username: string; password: string }) {
    if (dto.username == 'slider' && dto.password == '123456') {
      return { status: 'Success', requestData: dto };
    } else {
      return {
        status: 'Fail, Username and password incorrect',
        requestData: dto,
      };
    }
  }

  encryptData(data: any) {
    //     const publicRSAKey = `-----BEGIN RSA PUBLIC KEY-----
    // MIGJAoGBAMVIr9vcisBxXMVI9Gs6VgcQ6RKa3NiU8GXDEUIg5v9fDg6Oc1h96HhS
    // +7TtPpaDtKPnU2NJ7jok3+loO6RVWl3to/Of5J2ba/d150apVdINRyP9HTLLGOVK
    // r4ctBTEJzgr8w7QjHMCsRWo180DXAXx3gtqPxAid9afhnxxgkKmjAgMBAAE=
    // -----END RSA PUBLIC KEY-----
    // `;
    const publicRSAKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDamiKo8Jtix8B0Zb1NxQi0ZN1a
53dhInqjfaz9SYL9/1B3M7YG41kQem0TCbD7BAUXKbPCClTAPVs6tW6A8T8sk/jm
tdM8LCQQQf7xdlmcN90IhV43qcWCLwLkv135piSNWUfTaXR34q3smr1Q0Xoo+bqA
9KBzH48n+kXDNhBfwwIDAQAB
-----END PUBLIC KEY-----`;
    const aesKey = this.hmacService.createAESKey();
    const aesKeyEncrypted = this.hmacService.encryptRSAData(
      publicRSAKey,
      aesKey,
    );
    data = {
      ...data,
      nonce: new Date().getTime() + '',
      timestamp: new Date().getTime() + '',
    };
    const encryptedData = this.hmacService.encryptAESMessage(
      aesKey,
      JSON.stringify(data),
    );

    return {
      publicRSAKey,
      originalData: data,
      data: { keyEncrypted: aesKeyEncrypted, encryptedData: encryptedData },
    };
  }
}
