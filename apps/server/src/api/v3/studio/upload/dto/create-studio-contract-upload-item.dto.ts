import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateStudioContractUploadItemDto {
  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsInt()
  index: number;
}
