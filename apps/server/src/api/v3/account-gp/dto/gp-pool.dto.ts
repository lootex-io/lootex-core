import { IsNumber, IsString } from 'class-validator';

export class GpPoolTopUpDto {
  @IsNumber()
  amount: number;

  @IsString()
  note: string;
}
