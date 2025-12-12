import { Module } from '@nestjs/common';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { providers } from '@/model/providers';

@Module({
  imports: [
    SequelizeModule.forFeature(entities),
  ],
  providers: [
    StudioService,
    ...providers,
  ],
  controllers: [StudioController],
  exports: [StudioService],
})
export class StudioModule { }
