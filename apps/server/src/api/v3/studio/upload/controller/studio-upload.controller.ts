import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StudioUploadService } from '@/api/v3/studio/upload/service/studio-upload.service';
import {
  StudioUploadPreSignedLogoUrlDto,
  StudioUploadPreSignedUrlDto,
} from '@/api/v3/studio/upload/dto/studio-upload-pre-signed-url.dto';
import { CreateStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/create-studio-contract-upload-item.dto';
import { GetStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/get-studio-contract-upload-item.dto';
import { DeleteStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/delete-studio-contract-upload-item.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StudioContractUploadItemCallbackDto } from '@/api/v3/studio/upload/dto/studio-contract-upload-item-callback.dto';
import { UpdateStudioContractUploadItemDto } from '@/api/v3/studio/upload/dto/update-studio-contract-upload-item.dto';
import { AuthJwtGuard } from '@/api/v3/auth/auth.jwt.guard';
import { StudioContractPermissionGuard } from '@/api/v3/studio/studio-contract-permission.guard';
import { StorageService } from '@/external/storage/storage.service';
import { UploadFile } from '@/common/utils/types';

@Controller('api/v3/studio/upload')
export class StudioUploadController {
  constructor(
    private apiService: StudioUploadService,
    private storageService: StorageService,
  ) {}

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('presigned-url')
  getUploadPreSignedUrl(@Body() dto: StudioUploadPreSignedUrlDto) {
    return this.apiService.getUploadPreSignedUrl(dto);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('presigned-logo-url')
  getUploadPreSignedLogoUrl(@Body() dto: StudioUploadPreSignedLogoUrlDto) {
    return this.apiService.getUploadPreSignedLogoUrl(dto);
  }

  @Post('contracts/upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCollectionLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFile> {
    try {
      // this.logger.debug(file);
      //TODO: check file size
      const url = await this.storageService.uploadImage({
        content: file.buffer,
        fileName: file.originalname,
      });
      return {
        url,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Post('contracts/blind-box-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadContractBlindBoxImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFile> {
    try {
      // this.logger.debug(file);
      //TODO: check file size
      const url = await this.storageService.uploadImage({
        content: file.buffer,
        fileName: file.originalname,
      });
      return {
        url,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  /**
   * contract-item 上传s3回调
   * @param dto
   */
  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contract-item/callback')
  uploadContractItemCB(@Body() dto: StudioContractUploadItemCallbackDto) {
    return this.apiService.uploadContractItemCB(dto);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Get('contracts/:contractId/status')
  getUploadContractStatus(@Param('contractId') contractId: string) {
    return this.apiService.getUploadContractStatus(contractId);
  }

  /**
   * download update-contract cvs模版
   * @param contractId
   */
  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Get('contracts/:contractId/template')
  getContractItemTemplate(
    @Param('contractId') contractId: string,
    @Res() res: Response,
  ) {
    return this.apiService.getContractItemTemplate(res, contractId);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contracts/:contractId/item')
  createUploadContractItem(
    @Param('contractId') contractId: string,
    @Body() items: CreateStudioContractUploadItemDto[],
  ) {
    return this.apiService.createUploadContractItem(contractId, items);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contracts/:contractId/upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsvFile(
    @Param('contractId') contractId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.apiService.importCsvFile(contractId, file.buffer);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contracts/:contractId/update-item')
  updateUploadContractItem(
    @Param('contractId') contractId: string,
    @Body() dto: UpdateStudioContractUploadItemDto,
  ) {
    return this.apiService.updateContractUploadItem(contractId, dto);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Get('contracts/:contractId/item')
  getUploadContractItem(
    @Param('contractId') contractId: string,
    @Query() dto: GetStudioContractUploadItemDto,
  ) {
    return this.apiService.getUploadContractItem(contractId, dto);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contracts/:contractId/delete-item')
  deleteUploadContractItem(
    @Param('contractId') contractId: string,
    @Body() dto: DeleteStudioContractUploadItemDto,
  ) {
    return this.apiService.deleteUploadContractItem(contractId, dto);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contracts/:contractId/sync-ipfs')
  syncUploadContractToIpfs(@Param('contractId') contractId: string) {
    return this.apiService.syncUploadContractToIpfs(contractId);
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contracts/:contractId/sync-tokenUri')
  syncUploadContractTokenUri(
    @Param('contractId') contractId: string,
    @Query('sync') sync: string,
  ) {
    return this.apiService.syncContractTokenUriWrapped(contractId, sync);
  }

  @Post('contracts/upload-drop-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDropImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFile> {
    try {
      // this.logger.debug(file);
      //TODO: check file size
      const url = await this.storageService.uploadImage({
        content: file.buffer,
        fileName: file.originalname,
      });
      return {
        url,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('contracts/:contractId/blind-box/sync-ipfs')
  syncUploadContractBlindboxToIpfs(@Param('contractId') contractId: string) {
    return this.apiService.syncContractBlindboxToIpfs(contractId);
  }
}
