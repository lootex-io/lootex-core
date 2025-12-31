import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderModule } from '@/api/v3/order/order.module';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrderTasksService } from './order.sync.service';
import { LibsService } from '@/common/libs/libs.service';
import { CoreModule } from '@/core/core.module';
import { OrderConsumer } from '@/tasks/order-sync/consumer/order-consumer';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    OrderModule,
    SequelizeModule.forFeature(entities),
  ],
  providers: [LibsService, OrderTasksService, OrderConsumer],
})
export class TasksModule {}
