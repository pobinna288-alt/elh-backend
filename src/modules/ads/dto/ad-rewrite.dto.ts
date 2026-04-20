import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RewriteDescriptionDto {
  @ApiProperty({
    description: 'User text to rewrite into ad description',
    example: 'I have this amazing phone for sale! Its brand new and never been used!! Contact me ASAP!!!',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}

export class RewriteResponseDto {
  @ApiProperty({ 
    description: 'Rewritten description',
    example: 'Brand new phone for sale. Never used. Excellent condition. Available for immediate purchase.'
  })
  rewrittenText: string;

  @ApiProperty({ description: 'Word count' })
  wordCount: number;
}
