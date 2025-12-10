import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  BiruMintLogPaginationDto,
  ContractBlindboxDTO,
  ContractDraftDTO,
  ContractDropDTO,
  GetContractBlindboxListDTO,
  GetContractSimpleDTO,
  GetLaunchpadListDTO,
  SetLaunchpadInfoByAdminDTO,
  UpdateContractDraftDTO,
} from './studio.dto';
import { StudioService } from './studio.service';
import { AuthJwtGuard } from '../auth/auth.jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { Account } from '@/model/entities';
import {
  StudioAssetsListInterceptor,
  StudioContractsListInterceptor,
} from './studio.interceptors';
import { StudioContractPermissionGuard } from '@/api/v3/studio/studio-contract-permission.guard';
import { SimpleException } from '@/common/utils/simple.util';
import { ChainId } from '@/common/utils/types';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { Roles } from '../role/role.decorator';
import { Role } from '../role/role.interface';
import { RoleGuard } from '../role/role.guard';

@Controller('api/v3/studio')
export class StudioController {
  constructor(private readonly studioService: StudioService) { }

  @UseGuards(AuthJwtGuard)
  @UseInterceptors(StudioContractsListInterceptor)
  @Get('/contracts')
  async getAccountContracts(
    @CurrentUser() account: Account,
    @Query('limit') limit: number,
    @Query('page') page: number,
  ) {
    try {
      return await this.studioService.getAccountContracts(
        account.id,
        limit,
        page,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard)
  @Post('/contracts')
  async createContractDraft(
    @CurrentUser() account: Account,
    @Body() contract: ContractDraftDTO,
  ) {
    try {
      return await this.studioService.createContractDraft(account.id, contract);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  // get studio contract by chainId + address
  @Get('/contracts/simple')
  async getContractByChainId(@Query() param: GetContractSimpleDTO) {
    try {
      return await this.studioService.getContractByChainIdAndAddress(
        param.chainId,
        param.address,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseInterceptors(StudioContractsListInterceptor)
  @Get('contracts/launchpad')
  @Cacheable({
    key: 'launchpad:contracts',
    seconds: 60,
  })
  async getLaunchpadContracts(
    @Query('chainId') chainId: ChainId,
    @Query('limit') limit: number,
    @Query('page') page: number,
    // addresses
    @Query('addresses') addresses: string[],
  ) {
    try {
      return await this.studioService.getLaunchpadContracts({
        addresses,
        chainId,
        limit,
        page,
      });
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @Get('contracts/mint')
  @Cacheable({
    key: 'contract:mint',
    seconds: 10,
  })
  async getContractMintInfo(@Query() query: BiruMintLogPaginationDto) {
    try {
      return await this.studioService.getContractMintLog(query);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @Get('contracts/blindbox')
  @UseInterceptors(StudioAssetsListInterceptor)
  async getWalletHoldingBlindboxByContractAddress(
    @Query() dto: GetContractBlindboxListDTO,
  ) {
    try {
      return await this.studioService.getWalletHoldingBlindboxAssetsByContract(
        dto.walletAddress,
        dto.contractAddress,
        dto.chainId,
        dto.limit,
        dto.page,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @Get('contracts/blindbox/count')
  async getWalletHoldingBlindboxCountByContractAddress(
    @Query('walletAddress') walletAddress: string,
    @Query('contractAddress') contractAddress: string,
    @Query('chainId') chainId: ChainId,
  ) {
    try {
      return {
        count: await this.studioService.getWalletHoldingBlindboxAssetsCount(
          walletAddress,
          contractAddress,
          chainId,
        ),
      };
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard)
  @Get('/contracts/:contractId')
  async getContractDraft(
    @CurrentUser() account: Account,
    @Param('contractId') contractId: string,
  ) {
    try {
      await this.studioService.verifyContractOwner(account.id, contractId);
      return await this.studioService.getContractDraft(contractId);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Put('/contracts/:contractId')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  updateContractDraft(
    @Param('contractId') contractId: string,
    @Body() dto: UpdateContractDraftDTO,
  ) {
    try {
      return this.studioService.updateContractDraft(contractId, dto);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('/contracts/:contractId/blind-box')
  async setContractDraft(
    @CurrentUser() account: Account,
    @Param('contractId') contractId: string,
    @Body() blindbox: ContractBlindboxDTO,
  ) {
    try {
      return await this.studioService.updateContractBlindboxInfo(
        contractId,
        blindbox,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Post('/contracts/:contractId/drop')
  async createContractDropStage(
    @CurrentUser() account: Account,
    @Param('contractId') contractId: string,
    @Body() drop: ContractDropDTO,
  ) {
    try {
      return await this.studioService.createContractDropStage(contractId, drop);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Put('/contracts/:contractId/drop/visibility')
  async updateDropVisibility(
    @Param('contractId') contractId: string,
    @Query('visibility') visibility: boolean,
  ) {
    try {
      return await this.studioService.updateDropVisibility(
        contractId,
        visibility,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Put('/contracts/:contractId/drop/:dropId')
  async updateContractDropStage(
    @CurrentUser() account: Account,
    @Param('contractId') contractId: string,
    @Param('dropId') dropId: string,
    @Body() drop: ContractDropDTO,
  ) {
    try {
      return await this.studioService.updateContractDropStage(
        contractId,
        drop,
        dropId,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Get('/contracts/:contractId/drop')
  async getContractDropStage(
    @CurrentUser() account: Account,
    @Param('contractId') contractId: string,
  ) {
    try {
      return await this.studioService.getContractDropStage(contractId);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Delete('/contracts/:contractId/drop/:dropId')
  async deleteContractDropStage(
    @CurrentUser() account: Account,
    @Param('contractId') contractId: string,
    @Param('dropId') dropId: string,
  ) {
    try {
      return await this.studioService.deleteContractDropStage(
        contractId,
        dropId,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Put('/contracts/:contractId/deploy')
  async linkDeployedContract(
    @Param('contractId') contractId: string,
    @Query('txHash') txHash: string,
  ) {
    try {
      return await this.studioService.linkDeployedContract(contractId, txHash);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @Put('/contracts/:contractId/sync-status')
  async syncContractStatus(@Param('contractId') contractId: string) {
    try {
      return await this.studioService.syncContractStatus(contractId);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Delete('/contracts/:contractId')
  async deleteContractDraft(@Param('contractId') contractId: string) {
    try {
      return await this.studioService.deleteContractDraft(contractId);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Get('contracts/:contractId/post-publish')
  getUploadContractPostPublish(
    @Param('contractId') contractId: string,
    @Query('force') force?: boolean,
  ) {
    try {
      return this.studioService.getContractPostPublish(contractId, force);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseGuards(AuthJwtGuard, StudioContractPermissionGuard)
  @Get('contracts/:contractId/sales-overview')
  getSalesOverview(@Param('contractId') contractId: string) {
    try {
      return this.studioService.getSalesOverview(contractId);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @Get('contracts/:contractId/whitelist-check')
  @Cacheable({
    key: 'whitelist:check',
    seconds: 120,
  })
  async getUserWhitelist(
    @Param('contractId') contractId: string,
    @Query('walletAddress') address: string,
    @Query('dropId') dropId: string,
    @Query('tokenId') tokenId?: string,
  ) {
    try {
      return await this.studioService.getUserWhitelist(
        contractId,
        dropId,
        address,
        tokenId,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseInterceptors(StudioContractsListInterceptor)
  @Get('contracts/launchpad/current')
  @Cacheable({
    key: 'launchpad:current',
    seconds: 60,
  })
  async getLaunchpadCurrentContracts(
    @Query() GetLaunchpadListDTO: GetLaunchpadListDTO,
  ) {
    try {
      return await this.studioService.getLaunchpadCurrentContracts(
        GetLaunchpadListDTO,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  @UseInterceptors(StudioContractsListInterceptor)
  @Get('contracts/launchpad/past')
  @Cacheable({
    key: 'launchpad:past',
    seconds: 60,
  })
  async getLaunchpadPastContracts(
    @Query() GetLaunchpadListDTO: GetLaunchpadListDTO,
  ) {
    try {
      return await this.studioService.getLaunchpadPastContracts(
        GetLaunchpadListDTO,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  // 管理員用來設置 contract isLaunchpadHide, launchpadRank
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Roles(Role.Admin)
  @Post('contracts/:contractId/launchpad')
  async setLaunchpadInfo(
    @Param('contractId') contractId: string,
    @Body() dto: SetLaunchpadInfoByAdminDTO,
  ) {
    try {
      return await this.studioService.setLaunchpadInfoByAdmin(contractId, dto);
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }

  // 解盲
  @Post('contracts/reveal/challenge')
  async getChallenge(
    @Body()
    body: {
      walletAddress: string;
      chainId: string;
      contractAddress: string;
      tokenIds: string[];
    },
  ) {
    const challenge = await this.studioService.generateRevealChallenge(body);
    return challenge;
  }

  @Post('contracts/reveal/verify')
  async verifyChallenge(
    @Body()
    body: {
      walletAddress: string;
      chainId: string;
      contractAddress: string;
      tokenIds: string[];
      signature: string;
    },
  ) {
    const input = {
      walletAddress: body.walletAddress,
      chainId: body.chainId,
      contractAddress: body.contractAddress,
      tokenIds: body.tokenIds,
    };
    const result = await this.studioService.verifyRevealChallenge(
      input,
      body.signature,
    );
    return result;
  }

  // 取得中心化 metadata，會有外部服務來 call 這隻（OpenSea, Rarible...）
  @Get('contracts/:contractId/:tokenId')
  async getContractTokenMetadata(
    @Param('contractId') contractId: string,
    @Param('tokenId') tokenId: string,
  ) {
    try {
      return await this.studioService.getTokenMetadataFromCache(
        contractId,
        tokenId,
      );
    } catch (e) {
      throw SimpleException.fail({ message: e.message });
    }
  }
}
