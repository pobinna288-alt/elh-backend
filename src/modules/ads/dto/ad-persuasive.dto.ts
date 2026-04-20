import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PersuasiveDescriptionDto {
  @ApiProperty({
    description: 'Ad title',
    example: 'iPhone 15 Pro Max 256GB',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Ad category',
    example: 'Electronics',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Price',
    example: 1199.99,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Location',
    example: 'Los Angeles',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Key features or selling points',
    required: false,
    example: 'Brand new, sealed, with warranty',
  })
  @IsString()
  @IsOptional()
  keyFeatures?: string;
}

export class PersuasiveResponseDto {
  @ApiProperty({ 
    description: 'Persuasive ad description',
    example: '📱 iPhone 15 Pro Max 256GB - Brand new, sealed, with warranty. Experience cutting-edge technology that enhances your daily productivity and entertainment. Located in Los Angeles and priced at $1,199.99. Don\'t miss out - contact us today and make it yours! ⚡'
  })
  description: string;

  @ApiProperty({ description: 'Word count' })
  wordCount: number;
}
