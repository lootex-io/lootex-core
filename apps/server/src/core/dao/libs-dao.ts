import { ConfigurationService } from '@/configuration';
import { CacheService } from '@/common/cache';
import { InjectModel } from '@nestjs/sequelize';
import { Blockchain, Currency } from '@/model/entities';
import { Injectable, Logger } from '@nestjs/common';
import { Cacheable } from '@/common/decorator/cacheable.decorator';

@Injectable()
export class LibsDao {
  protected readonly logger = new Logger(LibsDao.name);

  constructor(
    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
    @InjectModel(Currency)
    private currencyRepository: typeof Currency,

    private readonly config: ConfigurationService,
    private readonly cacheService: CacheService,
  ) {}

  async findChainIdByChainShortName(chainShortName: string): Promise<string> {
    try {
      const blockChain = await this.blockchainRepository.findOne({
        where: {
          shortName: chainShortName,
        },
      });
      return blockChain ? blockChain.chainId + '' : '0';
    } catch (err) {
      this.logger.debug(err);
      return Promise.reject(err);
    }
  }

  async findChainShortNameByChainId(chainId: string | number): Promise<string> {
    try {
      const blockChain = await this.blockchainRepository.findOne({
        where: {
          chainId,
        },
      });
      return blockChain ? blockChain.shortName : 'None';
    } catch (err) {
      this.logger.debug(err);
      return Promise.reject(err);
    }
  }

  @Cacheable({ seconds: 300 })
  async findCurrencyByChain(chainId: string | number) {
    const currency = await this.currencyRepository.findOne({
      where: { isNative: true },
      include: [
        {
          model: Blockchain,
          where: {
            chainId: chainId,
          },
        },
      ],
    });
    return currency;
  }
}
