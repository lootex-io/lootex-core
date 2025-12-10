import { Module } from '@nestjs/common';
import { sequelizeProvider } from '@/model/providers';
import { TraitController } from './trait.controller';
import { TraitService } from './trait.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  controllers: [TraitController],
  providers: [TraitService, sequelizeProvider],
  exports: [TraitService],
})
export class TraitModule {}
