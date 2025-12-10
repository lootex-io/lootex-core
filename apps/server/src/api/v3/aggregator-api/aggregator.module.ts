import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { AggregatorController } from '@/api/v3/aggregator-api/aggregator.controller';
import { AggregatorService } from '@/api/v3/aggregator-api/aggregator.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  controllers: [AggregatorController],
  providers: [AggregatorService, JwtService],
})
export class AggregatorApiModule {}
