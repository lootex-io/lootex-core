import { Injectable } from '@nestjs/common';
import { ExploreService } from '@/api/v3/explore/explore.service';

@Injectable()
export class ExploreDataService {
  constructor(private readonly exploreService: ExploreService) {}

  assets(dto) {
    return this.exploreService.assets(dto);
  }

  assetsTest(dto) {
    return this.exploreService.assetsTest(dto);
  }
}
