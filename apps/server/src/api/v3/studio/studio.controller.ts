import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { GetLaunchpadListDTO, BiruMintLogPaginationDto } from './studio.dto';
import { StudioService } from './studio.service';
import { StudioContractsListInterceptor } from './studio.interceptors';
import { SimpleException } from '@/common/utils/simple.util';
import { Cacheable } from '@/common/decorator/cacheable.decorator';

@Controller('api/v3/studio')
export class StudioController {
  constructor(private readonly studioService: StudioService) { }

  @UseInterceptors(StudioContractsListInterceptor)
  @Get('contracts/launchpad/:type')
  @Cacheable({
    key: 'launchpad',
    seconds: 60,
  })
  async getLaunchpadContracts(
    @Param('type') type: 'current' | 'past',
    @Query() getLaunchpadListDTO: GetLaunchpadListDTO,
  ) {
    try {
      return await this.studioService.getLaunchpadContracts(
        type,
        getLaunchpadListDTO,
      );
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
}
