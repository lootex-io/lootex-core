import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Controller } from '@nestjs/common';
import { GpPoolService } from '@/api/v3/account-gp/service/gp-pool.service';

@ApiTags('Account-gp-pool')
@ApiCookieAuth()
@Controller('api/v3/accounts-gp-pool')
export class GpPoolController {
  constructor(private readonly gpPoolService: GpPoolService) {}

  // @Roles(Role.Admin)
  // @UseGuards(AuthJwtGuard, RoleGuard)
  // @Post('/top-up')
  // topUp(@CurrentUser() user: Account, @Body() dto: GpPoolTopUpDto) {
  //   return this.gpPoolService.topUp(user.id, dto);
  // }
}
