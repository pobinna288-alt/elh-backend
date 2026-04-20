import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HighConvertingDescriptionDto {
  @ApiProperty({
    description: 'Ad title',
    example: 'Tesla Model 3 Long Range',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Ad category',
    example: 'Automobile',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Price',
    example: 42999,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Location',
    example: 'Miami',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Key features or unique selling points',
    required: false,
    example: 'Low mileage, autopilot, premium interior',
  })
  @IsString()
  @IsOptional()
  keyFeatures?: string;

  @ApiProperty({
    description: 'Include urgency messaging',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  urgency?: boolean;
}

export class HighConvertingResponseDto {
  @ApiProperty({ 
    description: 'High-converting ad description',
    example: '🚀 DRIVE YOUR DREAM! Tesla Model 3 Long Range Meticulously maintained vehicle offering exceptional reliability, comfort, and value retention. Low mileage, autopilot, premium interior. Highly rated by hundreds of satisfied customers. Conveniently located in Miami at an incredible $42,999.00. ⚡ Limited availability - only a few remain at this unbeatable price! Don\'t wait another minute - message us now to claim yours before it\'s too late! 🔥'
  })
  description: string;

  @ApiProperty({ description: 'Word count' })
  wordCount: number;
}
