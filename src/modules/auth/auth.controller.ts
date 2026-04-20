import { Controller, Post, Body, UseGuards, Request, Ip, Headers, Get, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto, PasswordResetRequestDto, PasswordResetConfirmDto } from './dto/auth.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user and receive access + refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account locked' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
    schema: {
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshAccessToken(refreshTokenDto, ipAddress);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout from current device (revoke refresh token)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Logged out successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Logged out successfully from this device' },
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Refresh token is required' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices (revoke all refresh tokens)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Logged out from all devices',
    schema: {
      properties: {
        message: { type: 'string', example: 'Logged out from 3 device(s) successfully' },
        devicesLoggedOut: { type: 'number', example: 3 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @Request() req: any,
  ): Promise<{ message: string; devicesLoggedOut: number }> {
    return this.authService.logoutAllDevices(req.user.sub);
  }

  @Delete('sessions/:tokenId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout specific device by session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device logged out successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Device logged out successfully' },
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutDevice(
    @Request() req: any,
    @Param('tokenId') tokenId: string,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.logoutDevice(req.user.sub, tokenId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of active sessions',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string', example: 'uuid' },
          deviceInfo: { type: 'string', example: 'Mozilla/5.0...' },
          ipAddress: { type: 'string', example: '192.168.1.1' },
          createdAt: { type: 'string', example: '2026-01-12T10:00:00Z' },
          lastUsedAt: { type: 'string', example: '2026-01-12T15:30:00Z' },
          expiresAt: { type: 'string', example: '2026-02-11T10:00:00Z' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActiveSessions(
    @Request() req: any,
  ) {
    return this.authService.getActiveSessions(req.user.sub);
  }

  @Post('password-reset/request')
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ 
    status: 200, 
    description: 'Reset link sent if email exists',
    schema: {
      properties: {
        message: { type: 'string', example: 'If an account with that email exists, a password reset link has been sent' },
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async requestPasswordReset(
    @Body() passwordResetRequestDto: PasswordResetRequestDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.requestPasswordReset(passwordResetRequestDto.email);
  }

  @Post('password-reset/confirm')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password has been reset successfully. Please login with your new password.' },
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() passwordResetConfirmDto: PasswordResetConfirmDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.resetPassword(
      passwordResetConfirmDto.token,
      passwordResetConfirmDto.newPassword,
    );
  }
}
