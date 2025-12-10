import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateStudioContractUploadItemDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsOptional()
  traits: { value: any; trait_type: string; display_type: string }[];

  @ApiProperty()
  @IsOptional()
  ids: string[];

  @ApiProperty()
  mode: 'all' | 'batch';
}
