import { Injectable } from '@nestjs/common';
import * as AWS from '@aws-sdk/client-s3';
import { ConfigurationService } from '@/configuration/configuration.service';
import { DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

/**
 * 复制于 StorageService 。 解决操作不同aws区域
 */
@Injectable()
export class StorageS3Service {
  private s3Map = new Map<string, AWS.S3Client>();

  constructor(private readonly configService: ConfigurationService) {}

  getS3ByRegion(region: string) {
    let s3 = this.s3Map.get(region);
    if (!s3) {
      s3 = new AWS.S3Client({
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get('AWS_ACCESS_KEY_SECRET'),
        },
        region: region,
        // region: this.configService.get('AWS_S3_REGION'),
      });
      this.s3Map.set(region, s3);
    }
    return s3;
  }

  async downloadImage(option: {
    region: string;
    bucketName: string;
    fileKey: string;
    downloadPath: string;
  }) {
    const s3 = this.getS3ByRegion(option.region);
    const command = new GetObjectCommand({
      Bucket: option.bucketName,
      Key: option.fileKey,
    });
    let retry = 5;
    while (retry > 0) {
      try {
        const data = await s3.send(command);
        const fileStream = fs.createWriteStream(option.downloadPath);
        await pipelineAsync(data.Body, fileStream);
        return true;
      } catch (error) {
        console.error(`downloadImage error ${option.fileKey}:`, error.message);
        retry--;
      }
    }
    return false;
  }

  async deleteImage(option: {
    region: string;
    bucketName: string;
    fileKeys: string[];
  }) {
    const s3 = this.getS3ByRegion(option.region);
    const _deleteS3Files = async (option: {
      bucketName: string;
      fileKeys: string[];
    }) => {
      // 创建删除对象的参数
      const deleteParams = {
        Bucket: option.bucketName,
        Delete: {
          Objects: option.fileKeys.map((e) => ({ Key: e })),
          Quiet: false,
        },
      };
      const res = await s3.send(new DeleteObjectsCommand(deleteParams));
      // console.log('deleteImage ', res);
    };
    const pageSize = 500;
    const length = option.fileKeys.length;
    if (option.fileKeys.length > pageSize) {
      const pages = Math.ceil(length / pageSize);
      for (let page = 0; page < pages; page++) {
        const startIndex = page * pageSize;
        const endIndex = (page + 1) * pageSize;
        const fileKeys = option.fileKeys.slice(
          startIndex,
          endIndex <= length ? endIndex : length,
        );
        // console.log(`${startIndex},${endIndex <= length ? endIndex : length}`);
        await _deleteS3Files({
          bucketName: option.bucketName,
          fileKeys: fileKeys,
        });
      }
    } else {
      await _deleteS3Files(option);
    }
  }
}
