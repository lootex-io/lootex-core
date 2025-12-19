import { Module } from '@nestjs/common';
import { LibsService } from './libs.service';

import { blockchainProvider } from '@/model/providers';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [LibsService, blockchainProvider],
})
export class LibsModule {}
