import { NestFactory } from '@nestjs/core';
import { TasksModule } from '@/tasks/collection-trading-data/collection-trading-data.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(TasksModule);
}
bootstrap();
