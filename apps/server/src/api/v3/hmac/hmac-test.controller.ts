import {
  Body,
  Controller,
  Logger,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { HmacValidationInterceptor } from '@/api/v3/hmac/hmac-validation.middleware';
import { HmacTestService } from '@/api/v3/hmac/hmac-test.service';

/**
 * 测试与验证hmac poc所用，发布时移除
 */
@Controller('api/v3/hmac-test')
export class HmacTestController {
  private readonly logger = new Logger(HmacTestController.name);

  constructor(private readonly hmacTestService: HmacTestService) {}

  @Post('sign-in')
  @UseInterceptors(HmacValidationInterceptor)
  signIn(@Body() dto: { username: string; password: string }) {
    return this.hmacTestService.signIn(dto);
  }

  @Post('sign-in-encryption')
  @UseInterceptors(HmacValidationInterceptor)
  signInEncryption(@Body() dto: { username: string; password: string }) {
    return this.hmacTestService.signIn(dto);
  }

  @Post('encrypt-data')
  encryptData(@Body() dto: any) {
    return this.hmacTestService.encryptData(dto);
  }
}
