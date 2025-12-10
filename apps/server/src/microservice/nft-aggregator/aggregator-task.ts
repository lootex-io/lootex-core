import { NestFactory } from '@nestjs/core';
import { AggregatorTaskModule } from '@/microservice/nft-aggregator/aggregator-task.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(AggregatorTaskModule);
}
bootstrap();
