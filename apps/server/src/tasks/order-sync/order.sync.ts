import { NestFactory } from '@nestjs/core';
import { TasksModule } from '@/tasks/order-sync/order.sync.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(TasksModule);
}
bootstrap();
