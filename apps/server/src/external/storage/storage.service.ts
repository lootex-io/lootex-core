import { HttpException, Injectable } from '@nestjs/common';
// import { Storage } from '@google-cloud/storage';
import * as crypto from 'crypto';
import * as mime from 'mime';

import * as AWS from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ConfigurationService } from '@/configuration/configuration.service';

import { UploadFileInterface } from '@/external/storage/storage.interface';
import { IMGIX_BASE_URL } from '@/external/storage/constants';
import { DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

@Injectable()
export class StorageService {
  // private storage: Storage;
  private s3;

  constructor(private readonly configService: ConfigurationService) {
    // this.storage = new Storage();
    this.s3 = null;
  }

  async onModuleInit(): Promise<void> {
    this.s3 = new AWS.S3Client({
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_ACCESS_KEY_SECRET'),
      },
      region: this.configService.get('AWS_S3_REGION'),
    });
  }

  // generate imgix url
  private async getImgixUrl(fullFileName: string): Promise<string> {
    return `${IMGIX_BASE_URL}/${fullFileName}`;
  }

  // upload image to GCS and return full filename
  // async uploadImage(opt: UploadFileInterface): Promise<string> {
  //   const randomFileName = crypto.randomBytes(20).toString('hex');
  //   const fileMimeType = mime.getType(opt.fileName);
  //   const fileExt = mime.getExtension(fileMimeType);
  //   const fullFileName = `${randomFileName}.${fileExt}`;
  //   await this.storage
  //     .bucket(BUCKET)
  //     .file(`${BUCKET_PATH}/${fullFileName}`)
  //     .save(opt.content);
  //   return this.getImgixUrl(fullFileName);
  // }

  // upload image to S3 and return full filename
  async uploadImage(opt: UploadFileInterface): Promise<string> {
    const randomFileName = crypto.randomBytes(20).toString('hex');
    const fileMimeType = mime.getType(opt.fileName);
    const fileExt = mime.getExtension(fileMimeType);
    const fullFileName = `${randomFileName}.${fileExt}`;
    try {
      const upload = new Upload({
        client: this.s3,
        params: {
          ACL: 'public-read',
          Bucket: this.configService.get('AWS_S3_BUCKET'),
          Key: fullFileName,
          Body: opt.content,
          ContentType: fileMimeType,
          ContentDisposition: 'inline',
          CacheControl: this.configService.get('AWS_S3_CACHE_CONTROL'),
        },
      });

      await upload.done();
    } catch (err) {
      throw new HttpException(err.message, 400);
    }

    return this.getImgixUrl(fullFileName);
  }

  async downloadImage(option: {
    bucketName: string;
    fileKey: string;
    downloadPath: string;
  }) {
    const command = new GetObjectCommand({
      Bucket: option.bucketName,
      Key: option.fileKey,
    });
    let retry = 5;
    while (retry > 0) {
      try {
        const data = await this.s3.send(command);
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

  async deleteImage(option: { bucketName: string; fileKeys: string[] }) {
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
      const res = await this.s3.send(new DeleteObjectsCommand(deleteParams));
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
