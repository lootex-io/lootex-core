import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StudioUploadPreSignedUrlDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty()
  @IsNotEmpty()
  fileNames: string[];
}

export class StudioUploadPreSignedLogoUrlDto {
  @ApiProperty()
  @IsNotEmpty()
  fileName: string;
}
