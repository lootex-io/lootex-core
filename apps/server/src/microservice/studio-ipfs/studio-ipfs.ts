import { NestFactory } from '@nestjs/core';
import { StudioIpfsModule } from '@/microservice/studio-ipfs/studio-ipfs.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(StudioIpfsModule);
}
bootstrap();
