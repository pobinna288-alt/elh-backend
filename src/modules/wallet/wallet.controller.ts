import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AddCoinsDto, CoinsResponseDto } from './dto/coins.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('coins')
@Controller('coins')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('add')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Add coins to user account',
    description: 'Backend adds coins to database and returns updated balance. Frontend CANNOT modify coin balance.'
  })
  @ApiResponse({
    status: 200,
    description: 'Coins added successfully',
    type: CoinsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid amount' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addCoins(
    @Body() addCoinsDto: AddCoinsDto,
    @Request() req,
  ): Promise<CoinsResponseDto> {
    return this.walletService.addCoins(req.user.sub, addCoinsDto);
  }
}
