import { Controller, Get, Query } from '@nestjs/common';
import { GetTraitsListDTO } from './trait.dto';
import { TraitService } from './trait.service';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Cacheable } from '@/common/decorator/cacheable.decorator';

@ApiTags('Trait')
@ApiCookieAuth()
@Controller('api/v3')
export class TraitController {
  constructor(private readonly traitService: TraitService) {}

  @Get('traits')
  @Cacheable({ key: 'collection:traits-list', seconds: 60 * 5 })
  async getTrait(@Query() getCollectionTraitsDto: GetTraitsListDTO) {
    return await this.traitService.getTraitsByCollection(
      getCollectionTraitsDto,
    );
  }

  @Get('traits/account-owned')
  @Cacheable({ key: 'collection:traits-account-owned', seconds: 60 * 5 })
  async getAccountOwnedTraits(
    @Query() getCollectionTraitsDto: GetTraitsListDTO,
  ) {
    return await this.traitService.getTraitsByCollectionUserOwned(
      getCollectionTraitsDto,
    );
  }
}
