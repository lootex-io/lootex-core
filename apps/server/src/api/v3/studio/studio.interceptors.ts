import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

import { pagination, parseLimit } from '@/common/utils/pagination';

@Injectable()
export class StudioContractsListInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        contracts: data.rows.map((contract: any) => ({
          ...contract,
          collection: {
            id: contract.collectionId,
            contractAddress: contract.collectionContractAddress,
            bannerImageUrl: contract.collectionBannerImageUrl,
            logoImageUrl: contract.collectionLogoImageUrl,
            name: contract.collectionName,
            slug: contract.collectionSlug,
            description: contract.collectionDescription,
            isVerified: contract.collectionIsVerified,
            chainShortName: contract.collectionChainShortName,
            isMinting: contract.collectionIsMinting,
            isDrop: contract.collectionIsDrop,
          },
        })),
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}
