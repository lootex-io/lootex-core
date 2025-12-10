import { Module } from '@nestjs/common';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { HmacService } from '@/api/v3/hmac/hmac.service';
import { HmacTestController } from '@/api/v3/hmac/hmac-test.controller';
import { NonceService } from '@/api/v3/hmac/nonce.service';
import { HmacTestService } from '@/api/v3/hmac/hmac-test.service';

/**
 * 接口加密 hmac
 */
@Module({
  imports: [SequelizeModule.forFeature(entities)],
  controllers: [HmacTestController],
  providers: [HmacService, NonceService, HmacTestService],
  exports: [HmacService, NonceService],
})
export class HmacModule {}
