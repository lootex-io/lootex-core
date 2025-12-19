import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetWalletsByUsernameParamDTO {
  @ApiProperty()
  @IsString()
  username: string;
}
