import { LogDev, LogPro } from '@/model-small/entities/log.entity';
import { ApiLogDev, ApiLogPro } from '@/model-small/entities//api-log.entity';
import { AssetMetadataFailure } from '@/model-small/entities/asset-metadata-failure.entity';
import { CollectionMetadataFailure } from '@/model-small/entities/collection-metadata-failure.entity';

export const smallEntities = [
  LogDev,
  LogPro,
  ApiLogDev,
  ApiLogPro,
  AssetMetadataFailure,
  CollectionMetadataFailure,
];
