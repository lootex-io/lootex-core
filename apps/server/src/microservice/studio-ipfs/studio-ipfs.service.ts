import { Injectable, Logger } from '@nestjs/common';
import { BaseSqsService } from '@/core/base/sqs/baseSqs.service';
import { AWS_SQS_STUDIO_IPFS_SYNC_URL, QUEUE_ENV } from '@/common/utils';
import { QueueService } from '@/external/queue/queue.service';
import { InjectModel } from '@nestjs/sequelize';
import { StudioContractUploadItem } from '@/model/entities/studio/studio-contract-upload-item.entity';
import * as path from 'path';
import { ObjectManager } from '@filebase/sdk';
import { Buffer } from 'buffer';
import * as fs from 'fs';
import { ConfigurationService } from '@/configuration';
import { CacheService } from '@/common/cache';
import { StudioContract } from '@/model/entities';
import { ContractStatus } from '@/api/v3/studio/studio.interface';
import { StorageS3Service } from '@/core/storage/storage-s3.service';

@Injectable()
export class StudioIpfsService extends BaseSqsService {
  private readonly downloadsDir;
  private readonly s3Region;
  private readonly bucketName;
  private readonly fileBaseKey;
  private readonly fileBaseSecret;
  private readonly fileBaseBucket;
  private readonly fileBaseGw;

  constructor(
    @InjectModel(StudioContractUploadItem)
    private readonly studioContractUploadItemRepository: typeof StudioContractUploadItem,

    @InjectModel(StudioContract)
    private readonly studioContract: typeof StudioContract,

    private readonly storageS3Service: StorageS3Service,
    public readonly configService: ConfigurationService,
    public readonly queueService: QueueService,
    public readonly cacheService: CacheService,
  ) {
    super(
      new Logger(StudioIpfsService.name),
      AWS_SQS_STUDIO_IPFS_SYNC_URL,
      QUEUE_ENV.AWS_STUDIO_IPFS_SYNC_EXPIRED,
      true,
    );

    this.downloadsDir = this.configService.get<string>(
      'STUDIO_S3_DOWNLOAD_DIR',
    );
    this.s3Region = this.configService.get<string>('AWS_S3_STUDIO_REGION');
    this.bucketName = this.configService.get<string>('AWS_S3_STUDIO_BUCKET');
    this.fileBaseKey = this.configService.get<string>('FILEBASE_KEY');
    this.fileBaseSecret = this.configService.get<string>('FILEBASE_SECRET');
    this.fileBaseBucket = this.configService.get<string>('FILEBASE_BUCKET');
    this.fileBaseGw = this.configService.get<string>('FILEBASE_GATEWAY');

    // this.syncContract('1b08d885-4bfe-4694-9721-6dc302b615d0');
  }
  async exeTask(options: { payload: any; receiptHandle }) {
    this.syncContract(options.payload.contractId);
  }

  getCacheKey(payload): string {
    return QueueService.payloadFifoKey(
      this.configService.get(AWS_SQS_STUDIO_IPFS_SYNC_URL),
      payload,
    );
  }

  async syncContract(contractId: string) {
    this.logger.log(`syncContract ${contractId}`);
    let page = 1;
    const pageSize = 500;
    let haveMore = true;
    do {
      const items = await this.studioContractUploadItemRepository.findAll({
        attributes: ['id', 'fileKey', 'name', 'description', 'traits'],
        where: { contractId: contractId },
        limit: pageSize,
        order: [['index', 'asc']],
        offset: (page - 1) * pageSize,
      });
      // 检测本地目录存在
      if (items && items.length > 0) {
        const dirPath = path.dirname(
          path.join(this.downloadsDir, items[0].fileKey),
        );
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }
      for (const item of items) {
        if (item.fileKey) {
          const filePath = path.join(this.downloadsDir, item.fileKey);
          const flag = await this.storageS3Service.downloadImage({
            region: this.s3Region,
            bucketName: this.bucketName,
            downloadPath: filePath,
            fileKey: item.fileKey,
          });
          if (flag) {
            await this.syncFilesIpfs(item, filePath);
            this.logger.log(
              `syncFilesIpfs success ${contractId} ${item.fileKey}`,
            );
          } else {
            throw Error(
              `downloadS3Files downloadImage error, ${contractId} ${item.fileKey}.`,
            );
          }
        } else {
          this.logger.log(
            `syncFilesIpfs skip(synced already) ${contractId} ${item.fileKey}`,
          );
        }
      }
      haveMore = items.length > 0 ? true : false;
      page++;
    } while (haveMore);

    const updated = await this.studioContract.update(
      { status: ContractStatus.Publishing },
      { where: { id: contractId } },
    );
  }

  async syncFilesIpfs(uploadItem: StudioContractUploadItem, filePath: string) {
    const objectManager = new ObjectManager(
      this.fileBaseKey,
      this.fileBaseSecret,
      { bucket: this.fileBaseBucket },
    );
    const imageRes = await objectManager.upload(
      uploadItem.fileKey,
      fs.createReadStream(filePath),
      null,
      null,
    );
    const imageUri = `ipfs://${imageRes.cid}`;
    const metadata = {
      image: imageUri,
      name: uploadItem.name,
      description: uploadItem.description,
      attributes: uploadItem.traits,
    };
    const jsonKey = `${path.dirname(uploadItem.fileKey)}/${path.basename(filePath, path.extname(filePath))}.json`;
    const metaDataRes = await objectManager.upload(
      jsonKey,
      Buffer.from(JSON.stringify(metadata)),
      null,
      null,
    );
    // const tokenUri = `ipfs://${metaDataRes.cid}`;
    await this.studioContractUploadItemRepository.update(
      {
        // tokenUri: tokenUri,
        fileKey: '',
        fileIpfsUri: imageUri,
        uploadIpfsAt: new Date(),
        status: StudioContractUploadItem.STATUS_IPFS,
      },
      { where: { id: uploadItem.id } },
    );

    // remove local file
    fs.unlink(filePath, (err) => {});
    // remove s3 file
    this.storageS3Service.deleteImage({
      region: this.s3Region,
      bucketName: this.bucketName,
      fileKeys: [uploadItem.fileKey],
    });
    // this.logger.debug('remove local file and s3 file');
  }
}
