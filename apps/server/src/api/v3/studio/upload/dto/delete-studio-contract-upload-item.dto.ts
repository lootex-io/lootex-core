import { ApiProperty } from '@nestjs/swagger';

export class DeleteStudioContractUploadItemDto {
  @ApiProperty()
  ids?: string[];

  @ApiProperty()
  all = false;
}
