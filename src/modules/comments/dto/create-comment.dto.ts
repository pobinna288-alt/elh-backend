import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsString()
  adId: string;
}
