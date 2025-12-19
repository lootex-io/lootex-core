import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import FromData from 'form-data';
import { PinataData, PinataResponse } from './pinata.interface';
import { ConfigurationService } from '@/configuration';

@Injectable()
export class PinataService {
  private readonly logger = new Logger(PinataService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigurationService,
  ) {
    this.baseUrl = configService.get('IPFS_API_ENDPOINT');
    this.apiKey = `Bearer ${configService.get('IPFS_ACCESS_TOKEN')}`;
    this.logger.debug(`host ${this.baseUrl}, apiKey ${this.apiKey}`);
  }

  async pinJSONToIPFS(data: PinataData) {
    this.logger.debug(data);

    const response = await (
      await this.httpService.axiosRef.post<PinataResponse>(
        `${this.baseUrl}/pinning/pinJSONToIPFS`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
          },
        },
      )
    ).data;
    this.logger.debug(response);

    return response;
  }

  async pinFileUpload(data: FromData) {
    const response = await (
      await this.httpService.axiosRef.post<PinataResponse>(
        '${this.baseUrl}/pinning/pinFileToIPFS',
        data,
        {
          headers: {
            Authorization: this.apiKey,
            ...data.getHeaders(),
          },
        },
      )
    ).data;
    this.logger.debug(response);

    return response;
  }
}
