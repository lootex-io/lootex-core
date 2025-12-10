import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class StudioContractUploadItemCallbackDto {
  @ApiProperty()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty()
  @IsNotEmpty()
  items: { fileName: string; fileCID: string }[];
}
