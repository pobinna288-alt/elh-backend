import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WriteDescriptionDto {
  @ApiProperty({
    description: 'Ad title',
    example: 'MacBook Pro 16-inch',
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
    example: 1499.99,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Location',
    example: 'San Francisco',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Key features or details',
    required: false,
    example: '16GB RAM, 512GB SSD, excellent condition',
  })
  @IsString()
  @IsOptional()
  keyFeatures?: string;
}

export class WriteResponseDto {
  @ApiProperty({ 
    description: 'Written ad description',
    example: 'MacBook Pro 16-inch available in San Francisco. 16GB RAM, 512GB SSD, excellent condition. Perfect for everyday use and reliability. Priced at $1,499.99. Contact us today to learn more.'
  })
  description: string;

  @ApiProperty({ description: 'Word count' })
  wordCount: number;
}
