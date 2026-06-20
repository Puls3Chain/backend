import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Version,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottle } from '../config/throttle.config';
import { User } from '../entities/user.entity';

@ApiTags('auth')
@Controller('auth')
@Version('1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with Stellar wallet address' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          example: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
        },
      },
      required: ['walletAddress'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated with Stellar wallet',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expires_in: 3600,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
          email: 'user@example.com',
        },
      },
    },
  })
  @Post('stellar/login')
  @AuthThrottle()
  async loginStellar(@Body('walletAddress') walletAddress: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, unknown>;
  }> {
    if (!walletAddress || typeof walletAddress !== 'string') {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const normalized = walletAddress.trim();
    if (!normalized.startsWith('G') || normalized.length < 56) {
      throw new HttpException(
        'Invalid Stellar wallet address format',
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.authService.validateStellarUser(normalized);
    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Get authentication nonce for Stellar wallet' })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    schema: {
      example: {
        nonce: 'abc123def456',
        message: 'Please sign this message to authenticate with StellarTip-Backend. Nonce: abc123def456 Timestamp: 2024-01-01T00:00:00Z',
      },
    },
  })
  @Get('nonce')
  @AuthThrottle()
  getNonce(@Query('walletAddress') walletAddress: string): {
    nonce: string;
    message: string;
  } {
    if (!walletAddress) {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.authService.getNonce(walletAddress);
  }

  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expires_in: 3600,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
          email: 'user@example.com',
          displayName: 'John Doe',
        },
      },
    },
  })
  @Post('signup')
  @AuthThrottle()
  async signup(@Body() signupDto: SignupDto): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, unknown>;
  }> {
    return this.authService.signup(
      signupDto.email,
      signupDto.password,
      signupDto.username,
      signupDto.displayName,
    );
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expires_in: 3600,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
          email: 'user@example.com',
        },
      },
    },
  })
  @Post('login')
  @AuthThrottle()
  async login(@Body() loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, unknown>;
  }> {
    return this.authService.loginWithEmail(loginDto.email, loginDto.password);
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refresh_token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expires_in: 3600,
      },
    },
  })
  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    if (!refreshToken) {
      throw new HttpException(
        'refresh_token is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.authService.refreshToken(refreshToken);
  }

  @ApiOperation({ summary: 'Get current user profile from JWT' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        email: 'user@example.com',
        displayName: 'John Doe',
        bio: 'Content creator and developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request): User | undefined {
    return req.user;
  }
}
