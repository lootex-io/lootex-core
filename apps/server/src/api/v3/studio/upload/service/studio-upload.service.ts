import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
// @ts-ignore
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InjectModel } from '@nestjs/sequelize';
import { pagination } from '@/common/utils/pagination';
import { GetStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/get-studio-contract-upload-item.dto';
import { DeleteStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/delete-studio-contract-upload-item.dto';
import {
  StudioUploadPreSignedLogoUrlDto,
  StudioUploadPreSignedUrlDto,
} from '@/api/v3/studio/upload/dto/studio-upload-pre-signed-url.dto';
import { CreateStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/create-studio-contract-upload-item.dto';
import { SimpleException } from '@/common/utils/simple.util';
import * as fastcsv from 'fast-csv';
import { Readable } from 'stream';
import { StudioContractUploadItemCallbackDto } from '@/api/v3/studio/upload/dto/studio-contract-upload-item-callback.dto';
import { Response } from 'express';
import { StudioContractUploadItem } from '@/model/entities/studio/studio-contract-upload-item.entity';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { UpdateStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/update-studio-contract-upload-item.dto';
import { AWS_SQS_STUDIO_IPFS_SYNC_URL, QUEUE_ENV } from '@/common/utils';
import { QueueService } from '@/external/queue/queue.service';
import { Op, Sequelize } from 'sequelize';
import * as path from 'path';
import { ContractStatus } from '../../studio.interface';
import { StudioContract } from '@/model/entities';
import * as IpfsHash from 'ipfs-only-hash';
import { FileBaseService } from '@/core/ipfs/filebase.service';
import { ObjectManager } from '@filebase/sdk';
import axios from 'axios';
import * as fs from 'fs';
import { CacheService } from '@/common/cache';
import { StorageS3Service } from '@/core/storage/storage-s3.service';

@Injectable()
export class StudioUploadService {
  private readonly logger = new Logger(StudioUploadService.name);
  private readonly awsKey;
  private readonly awsKeySecret;
  private readonly s3: S3Client;
  private readonly s3Region: string;
  private readonly uploadBucket: string;

  private readonly downloadsDir;
  private readonly bucketName;
  private readonly fileBaseKey;
  private readonly fileBaseSecret;
  private readonly fileBaseBucket;

  constructor(
    @InjectModel(StudioContract)
    private readonly studioContract: typeof StudioContract,

    @InjectModel(StudioContractUploadItem)
    private readonly studioContractUploadItemRepository: typeof StudioContractUploadItem,

    private readonly storageS3Service: StorageS3Service,
    private readonly fileBaseService: FileBaseService,

    private readonly queueService: QueueService,

    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.awsKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    this.awsKeySecret = this.configService.get<string>('AWS_ACCESS_KEY_SECRET');
    this.s3Region = this.configService.get<string>('AWS_S3_STUDIO_REGION');
    this.uploadBucket = this.configService.get<string>('AWS_S3_STUDIO_BUCKET');

    this.downloadsDir = this.configService.get<string>(
      'STUDIO_S3_DOWNLOAD_DIR',
    );
    this.bucketName = this.configService.get<string>('AWS_S3_STUDIO_BUCKET');
    this.fileBaseKey = this.configService.get<string>('FILEBASE_KEY');
    this.fileBaseSecret = this.configService.get<string>('FILEBASE_SECRET');
    this.fileBaseBucket = this.configService.get<string>('FILEBASE_BUCKET');

    this.logger.debug(
      `awsKey ${this.awsKey}, awsKeySecret ${this.awsKeySecret}, s3Region ${this.s3Region}, uploadBucket ${this.uploadBucket}`,
    );

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: this.awsKey,
        secretAccessKey: this.awsKeySecret,
      },

      region: this.s3Region,
    });
  }

  async getUploadPreSignedUrl(dto: StudioUploadPreSignedUrlDto) {
    const res = [];
    for (const fileName of dto.fileNames) {
      const command = new PutObjectCommand({
        Bucket: this.uploadBucket,
        Key: `contract/${dto.contractId}/${fileName}`,
        // Key: `${dto.fileName}`,
        // ResponseContentType: 'image/jpeg',
      });
      const signedUrl = await getSignedUrl(this.s3, command, {
        expiresIn: 3600,
      });
      const uploadContractItem =
        await this.studioContractUploadItemRepository.findOne({
          where: { contractId: dto.contractId, fileName: fileName },
        });
      if (!uploadContractItem) {
        throw SimpleException.error(`${fileName} not found`);
      } else {
        uploadContractItem.fileKey = command.input.Key;
        await uploadContractItem.save();
      }
      res.push({
        signedUrl: signedUrl,
        fileKey: command.input.Key,
      });
    }
    return res;
  }

  async getUploadPreSignedLogoUrl(dto: StudioUploadPreSignedLogoUrlDto) {
    const command = new PutObjectCommand({
      Bucket: this.uploadBucket,
      Key: `contract/logo/${new Date().getTime()}${path.extname(dto.fileName)}`,
      // Key: `${dto.fileName}`,
      // ResponseContentType: 'image/jpeg',
    });
    const signedUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 3600,
    });
    return { signedUrl: signedUrl, fileKey: command.input.Key };
  }

  async uploadContractItemCB(dto: StudioContractUploadItemCallbackDto) {
    let updatedCount = 0;
    for (const item of dto.items) {
      const res = await this.studioContractUploadItemRepository.update(
        {
          status: StudioContractUploadItem.STATUS_S3,
          uploadS3At: new Date(),
          fileIpfsUri: `ipfs://${item.fileCID}`,
        },
        {
          where: { contractId: dto.contractId, fileName: item.fileName },
        },
      );
      updatedCount += res[0];
    }

    return { updatedCount: updatedCount };
  }

  /**
   * Init,  S3Done, IpfsDone
   * @param contractId
   */
  async getUploadContractStatus(contractId: string) {
    let status = 'Init';
    const count = await this.studioContractUploadItemRepository.count({
      where: { contractId: contractId },
    });
    const s3Count = await this.studioContractUploadItemRepository.count({
      where: {
        contractId: contractId,
        status: StudioContractUploadItem.STATUS_S3,
      },
    });
    let ipfsCount = 0;
    if (s3Count === count) {
      status = 'S3Done';
      ipfsCount = await this.studioContractUploadItemRepository.count({
        where: {
          contractId: contractId,
          status: StudioContractUploadItem.STATUS_IPFS,
        },
      });
      if (ipfsCount === count) {
        status = 'IpfsDone';
      }
    }
    const minIndex = await this.studioContractUploadItemRepository.min(
      'index',
      { where: { contractId: contractId } },
    );

    let metadataDone = true;
    if (count === 0) {
      metadataDone = false;
    } else {
      if (
        await this.studioContractUploadItemRepository.findOne({
          where: {
            contractId: contractId,
            name: '',
          },
        })
      ) {
        metadataDone = false;
      }
    }
    return {
      status: status,
      minIndex,
      metadataDone: metadataDone,
      s3Progress: Math.floor((s3Count / count) * 100),
      ipfsProgress: Math.floor((ipfsCount / count) * 100),
    };
  }

  async getContractItemTemplate(res: Response, contractId: string) {
    if (
      await this.studioContractUploadItemRepository.findOne({
        where: {
          contractId: contractId,
          status: StudioContractUploadItem.STATUS_INIT,
        },
      })
    ) {
      throw SimpleException.error(
        'There are files that have not been uploaded',
      );
    }
    const items = await this.studioContractUploadItemRepository.findAll({
      attributes: ['fileName'],
      where: { contractId: contractId },
      order: [['index', 'asc']],
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=template.csv`);
    const csvStream = fastcsv.format({ headers: true, objectMode: true });
    csvStream.pipe(res);
    for (const item of items) {
      csvStream.write({
        file_name: item.fileName,
        name: '',
        description: '',
        'attributes[]': '',
      });
    }
    csvStream.end();
  }

  async createUploadContractItem(
    contractId: string,
    items: CreateStudioContractUploadItemDto[],
  ) {
    let startIndex = 0;
    if (
      await this.studioContractUploadItemRepository.findOne({
        attributes: ['id'],
        where: { contractId: contractId },
      })
    ) {
      const minIndex: number =
        await this.studioContractUploadItemRepository.min('index', {
          where: { contractId: contractId },
        });
      startIndex = minIndex - items.length;
    }

    const values = items.map((e) => ({
      contractId: contractId,
      fileName: e.fileName,
      index: e.index ?? startIndex++,
    }));
    // console.log(values);
    try {
      await this.studioContractUploadItemRepository.bulkCreate(values);
      await this._arrangeContractItemTokenIds(contractId);
    } catch (e) {
      throw SimpleException.error(e.message);
    }
    return;
  }

  async importCsvFile(contractId: string, content: Buffer) {
    const _parseCsv = (buffer) => {
      return new Promise((resolve, reject) => {
        const results = [];
        // Convert buffer to readable stream
        const stream = new Readable({
          read() {
            this.push(buffer);
            this.push(null); // End of stream
          },
        });
        stream
          .pipe(fastcsv.parse({ headers: true }))
          .on('data', (row) => results.push(row))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    };
    let data: any[] = [];
    try {
      data = (await _parseCsv(content)) as any[];
    } catch (error) {
      this.logger.error(`Error parsing CSV: ${error.message}`);
      throw SimpleException.error(`Error parsing CSV: ${error.message}`);
    }
    const count = await this.studioContractUploadItemRepository.count({
      where: { contractId: contractId },
    });
    if (count != data.length) {
      throw SimpleException.error(
        'Inconsistencies found between the metadata and uploaded files. Please check the data sheet and reupload.',
      );
    }
    for (const item of data) {
      const fileName = item.file_name;
      const name = item.name;
      const description = item.description;
      const keys = Object.keys(item);
      const traits = [];
      for (const key of keys) {
        if (key.indexOf('attributes') > -1) {
          const regex = /\[(.*?)\]/;
          const match = key.match(regex);
          if (match) {
            // match[1] 包含方括号中的内容
            const realKey = match[1];
            const value = item[key];
            traits.push({ value: value, trait_type: realKey });
          }
        }
      }
      // console.log(
      //   `fileName ${fileName} name ${name} description ${description}`,
      //   traits,
      // );
      await this.studioContractUploadItemRepository.update(
        { name, description, traits: traits.length === 0 ? null : traits },
        { where: { contractId: contractId, fileName: fileName } },
      );
    }

    await this._arrangeContractItemTokenIds(contractId);
    return;
  }

  async getUploadContractItem(
    contractId: string,
    dto: GetStudioContractUploadItemDto,
  ) {
    const limit = dto.limit;
    const offset = (dto.page - 1) * dto.limit;

    let where: any = {
      contractId: contractId,
      status: { [Op.not]: StudioContractUploadItem.STATUS_INIT },
    };
    if (dto.keyword) {
      where = { ...where, fileName: { [Op.like]: `${dto.keyword}%` } };
    }
    const { rows, count } =
      await this.studioContractUploadItemRepository.findAndCountAll({
        where: where,
        limit: limit,
        offset: offset,
        order: [['index', 'asc']],
      });
    const items = rows.map((e) => {
      let imageUrl = '';
      if (e.status == StudioContractUploadItem.STATUS_IPFS && e.fileIpfsUri) {
        imageUrl = e.fileIpfsUri;
      } else if (e.fileKey) {
        imageUrl = `https://${this.uploadBucket}.s3.amazonaws.com/${e.fileKey}`;
      }
      return { ...e.toJSON(), imageUrl };
    });
    // console.log(items);
    return {
      items: items,
      pagination: pagination(count, dto.page, limit),
    };
  }

  async updateContractUploadItem(
    contractId: string,
    dto: UpdateStudioContractUploadItemDto,
  ) {
    let updateCount = 0;
    if (dto.mode === 'all') {
      const res = await this.studioContractUploadItemRepository.update(dto, {
        where: { contractId: contractId },
      });
      updateCount = res[0];
    } else if (dto.mode === 'batch' && dto.ids) {
      const res = await this.studioContractUploadItemRepository.update(dto, {
        where: { contractId: contractId, id: dto.ids },
      });
      updateCount = res[0];
    }

    return { updateCount };
  }

  async deleteUploadContractItem(
    contractId: string,
    dto: DeleteStudioContractUploadItemDto,
  ) {
    let deletedCount = 0;
    if (dto.all) {
      const items = await this.studioContractUploadItemRepository.findAll({
        attributes: ['fileKey'],
        where: { contractId: contractId },
      });
      const fileKeys = items.map((e) => e.fileKey);
      if (fileKeys && fileKeys.length > 0) {
        await this.storageS3Service.deleteImage({
          region: this.s3Region,
          bucketName: this.uploadBucket,
          fileKeys: fileKeys,
        });
        deletedCount = await this.studioContractUploadItemRepository.destroy({
          where: { contractId: contractId },
        });
      }
    } else {
      if (dto.ids) {
        const items = await this.studioContractUploadItemRepository.findAll({
          attributes: ['fileKey'],
          where: { contractId: contractId, id: dto.ids },
        });
        const fileKeys = items.map((e) => e.fileKey);
        if (fileKeys && fileKeys.length > 0) {
          await this.storageS3Service.deleteImage({
            region: this.s3Region,
            bucketName: this.uploadBucket,
            fileKeys: fileKeys,
          });
          deletedCount = await this.studioContractUploadItemRepository.destroy({
            where: { contractId: contractId, id: dto.ids },
          });
        }
      }
    }
    if (deletedCount > 0) {
      await this._arrangeContractItemTokenIds(contractId);
    }
    return { deletedCount };
  }

  /**
   * 整理contract item token-id 并赋值
   */
  async _arrangeContractItemTokenIds(contractId: string) {
    let index = 0; // 序号， 用来生成token id
    let page = 1;
    const pageSize = 500;
    let haveMore = true;
    do {
      const items = await this.studioContractUploadItemRepository.findAll({
        attributes: ['id', 'tokenId'],
        where: { contractId: contractId },
        order: [['index', 'asc']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      for (const item of items) {
        item.tokenId = index.toString();
        await item.save();
        index++;
      }
      haveMore = items.length > 0 ? true : false;
      page++;
    } while (haveMore);
  }

  async syncContractTokenUriWrapped(contractId, sync: string) {
    const cacheKey = `studio:syncContractTokenUri:${contractId}`;
    const cacheSeconds = 15 * 60; // 缓存15分钟
    let res = await this.cacheService.getCache<any>(cacheKey);
    if (res) {
      return res;
    }
    res = { status: 'pending' };
    await this.cacheService.setCache<string>(cacheKey, res, cacheSeconds);

    if (sync === 'true') {
      const res = await this.syncContractTokenUri(contractId);
      await this.cacheService.setCache(
        cacheKey,
        { status: 'success', baseUri: res.baseUri },
        cacheSeconds,
      );
      return { status: 'success', baseUri: res.baseUri };
    } else {
      // 异步执行
      this.syncContractTokenUri(contractId)
        .then((res) => {
          this.cacheService.setCache(
            cacheKey,
            { status: 'success', baseUri: res.baseUri },
            cacheSeconds,
          );
        })
        .catch((e) => {
          this.cacheService.setCache(
            cacheKey,
            { status: 'fail', message: e.message },
            cacheSeconds,
          );
        });
    }

    return res;
  }

  async syncContractTokenUri(contractId: string) {
    const data = [];
    let index = 0; // 序号， 用来生成token id
    let page = 1;
    const pageSize = 500;
    let haveMore = true;
    do {
      const items = await this.studioContractUploadItemRepository.findAll({
        attributes: [
          'id',
          'fileName',
          'fileIpfsUri',
          'name',
          'description',
          'traits',
          'tokenUri',
          'tokenId',
        ],
        where: { contractId: contractId },
        order: [['index', 'asc']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      for (const item of items) {
        if (!item.fileIpfsUri) {
          throw Error(`${item.fileName} Ipfs uri not found`);
        }
        const metadata = {
          image: item.fileIpfsUri,
          name: item.name,
          description: item.description,
          attributes: item.traits,
        };
        const cid = await IpfsHash.of(Buffer.from(JSON.stringify(metadata)));
        item.tokenUri = `ipfs://${cid}`;
        item.tokenId = index.toString();
        // this.logger.debug(`_updateContractMetadata cid ${cid}`);
        await item.save();

        data.push({
          path: `/${index}`,
          content: Buffer.from(
            JSON.stringify({
              image: item.fileIpfsUri,
              name: item.name,
              description: item.description,
              attributes: item.traits,
            }),
          ),
        });
        index++;
      }
      haveMore = items.length > 0 ? true : false;
      page++;
    } while (haveMore);
    const cid = await this.fileBaseService.uploadObjects(contractId, data);
    const baseUri = `ipfs://${cid}`;
    try {
      await this.studioContractUploadItemRepository.update(
        {
          tokenUri: Sequelize.fn(
            'CONCAT',
            `${baseUri}/`,
            Sequelize.col('token_id'),
          ),
        },
        {
          where: {
            contractId: contractId,
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error updating records: ${error.message}`);
    }
    return { baseUri };
  }

  @Cacheable({ seconds: 60 })
  async syncUploadContractToIpfs(contractId: string) {
    const updated = await this.studioContract.update(
      { status: ContractStatus.Publishing },
      { where: { id: contractId } },
    );

    const count = await this.studioContractUploadItemRepository.count({
      where: {
        contractId: contractId,
      },
    });
    const ipfsCount = await this.studioContractUploadItemRepository.count({
      where: {
        contractId: contractId,
        status: StudioContractUploadItem.STATUS_IPFS,
      },
    });

    const sqsStatus = await this.queueService.sendMessageToFifoSqsCacheable({
      queueUrl: this.configService.get(AWS_SQS_STUDIO_IPFS_SYNC_URL),
      payload: { contractId: contractId },
      expiredTime: this.configService.get(
        QUEUE_ENV.AWS_STUDIO_IPFS_SYNC_EXPIRED,
      ), // 同一个消息3600s最多发一次
    });
    // cache to redis
    return {
      queueStatus: sqsStatus.queueStatus,
      progress: Math.ceil((ipfsCount / count) * 100), // [0, 100]
      startTime: Math.ceil(new Date().getTime() / 100),
      endTime: Math.ceil(new Date().getTime() / 100),
      contractId: contractId,
    };
  }

  async syncContractBlindboxToIpfs(contractId: string) {
    // 從 studioContract 拿到 contractId 下的 blindbox
    const contract = await this.studioContract.findByPk(contractId);
    if (!contract) {
      this.logger.error(`Contract not found for id ${contractId}`);
      return;
    }

    const url = contract.blindboxUrl.replace(
      'https://lootex-dev.s3.us-east-1.amazonaws.com/',
      'https://lootex-dev.s3.amazonaws.com/',
    );

    const objectManager = new ObjectManager(
      this.fileBaseKey,
      this.fileBaseSecret,
      { bucket: this.fileBaseBucket },
    );

    // 下載圖片到本地
    const imagePath = path.join(this.downloadsDir, path.basename(url));
    this.logger.debug(`Downloading image to ${imagePath}`);

    const writer = fs.createWriteStream(imagePath);

    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`Error downloading image from URL ${url}:`, error);
      throw SimpleException.fail({
        debug: `Failed to download image: ${error.message}`,
      });
    }

    // 確認檔案是否正確下載
    if (!fs.existsSync(imagePath)) {
      this.logger.error(
        `Image file ${imagePath} does not exist after download.`,
      );
      throw SimpleException.fail({
        debug: `Image file ${imagePath} does not exist`,
      });
    }

    // 把圖片上傳到 IPFS
    let imageRes;
    try {
      this.logger.debug(`Uploading image to IPFS from ${imagePath}`);
      imageRes = await objectManager.upload(
        path.basename(url),
        fs.createReadStream(imagePath),
        null,
        null,
      );
    } catch (error) {
      this.logger.error(`Error uploading image to IPFS:`, error);
      throw SimpleException.fail({
        debug: `Failed to upload image to IPFS: ${error.message}`,
      });
    }

    // 包成 metadata
    const metadata = {
      image: `ipfs://${imageRes.cid}`,
      name: contract.blindboxName,
      description: contract.blindboxDescription,
      attributes: contract.blindboxTraits,
    };

    const jsonKey = `${path.basename(contract.blindboxUrl)}.json`;

    // 上傳 metadata 到 IPFS
    let metaDataRes;
    try {
      this.logger.debug(`Uploading metadata to IPFS for jsonKey ${jsonKey}`);
      metaDataRes = await objectManager.upload(
        jsonKey,
        [
          {
            path: '/0',
            content: Buffer.from(JSON.stringify(metadata)),
          },
        ],
        null,
        null,
      );
    } catch (error) {
      this.logger.error(`Error uploading metadata to IPFS:`, error);
      throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
    }

    const tokenUri = `ipfs://${metaDataRes.cid}`;

    // 更新 studioContract 的 blindboxIpfsUri
    try {
      await this.studioContract.update(
        {
          blindboxIpfsUri: tokenUri,
        },
        { where: { id: contract.id } },
      );
    } catch (error) {
      this.logger.error(`Error updating contract with tokenUri:`, error);
      throw new Error(`Failed to update contract: ${error.message}`);
    }

    // 刪除本地檔案
    try {
      fs.unlinkSync(imagePath);
    } catch (error) {
      this.logger.warn(`Error removing local file ${imagePath}:`, error);
    }

    return {
      imageUri: `ipfs://${imageRes.cid}`,
      tokenUri: tokenUri,
      blindboxKey: contract.blindboxKey,
    };
  }
}
