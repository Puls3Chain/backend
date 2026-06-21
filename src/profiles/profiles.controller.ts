import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Version,
  CacheTTL,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateSocialLinksDto } from './dto/update-social-links.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';

@ApiTags('profiles')
@Version('1')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @ApiOperation({ summary: 'Get tipping info for a creator profile' })
  @ApiResponse({
    status: 200,
    description: 'Tipping info retrieved successfully',
    schema: {
      example: {
        walletAddress: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
        displayName: 'John Doe',
        bio: 'Content creator and developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        socialLinks: {
          twitter: 'https://twitter.com/johndoe',
          github: 'https://github.com/johndoe',
        },
      },
    },
  })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @Get(':username/tipping-info')
  async getTippingInfo(
    @Param('username') username: string,
  ): Promise<Record<string, unknown>> {
    return this.profilesService.getTippingInfo(username);
  }

  @ApiOperation({ summary: 'Get public profile by username' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        email: 'user@example.com',
        displayName: 'John Doe',
        bio: 'Content creator and developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        socialLinks: {
          twitter: 'https://twitter.com/johndoe',
          github: 'https://github.com/johndoe',
        },
        createdAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  @Get(':username')
  async getProfile(@Param('username') username: string): Promise<User | null> {
    return this.profilesService.getProfile(username);
  }

  @ApiOperation({ summary: 'Search profiles by query' })
  @ApiResponse({
    status: 200,
    description: 'Profiles retrieved successfully',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
          displayName: 'John Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        {
          id: '987f6543-e21b-43d3-a456-426614174000',
          username: 'janedoe',
          displayName: 'Jane Doe',
          avatarUrl: 'https://example.com/avatar2.jpg',
        },
      ],
    },
  })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @Get()
  async searchProfiles(@Query('q') query: string): Promise<User[]> {
    if (!query) {
      return [];
    }
    return this.profilesService.searchProfiles(query);
  }

  @ApiOperation({ summary: 'Get creator analytics dashboard (cached 5 min)' })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
    schema: {
      example: {
        summary: {
          totalTipsReceived: 150,
          totalAmountReceived: 1250.5,
          averageTipAmount: 8.33,
          largestTipAmount: 100,
        },
        byAsset: [
          { asset: 'XLM', totalAmount: 1000, tipCount: 120 },
          { asset: 'USDC', totalAmount: 250.5, tipCount: 30 },
        ],
        timeSeries: [
          { date: '2024-01-01', count: 10, totalAmount: 85, asset: 'XLM' },
          { date: '2024-01-02', count: 15, totalAmount: 120, asset: 'XLM' },
        ],
        topSupporters: [
          {
            walletAddress: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
            totalAmount: 500,
            tipCount: 50,
            lastTipAt: '2024-01-15T00:00:00Z',
          },
        ],
        period: '30d',
        generatedAt: '2024-01-15T00:00:00Z',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @Get('me/analytics')
  async getAnalytics(
    @Req() req: Request,
    @Query('period') period?: string,
    @Query('asset') asset?: string,
  ): Promise<Record<string, unknown>> {
    return this.profilesService.getAnalytics(req.user!.id, period, asset);
  }

  @ApiOperation({ summary: 'Update authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        email: 'user@example.com',
        displayName: 'John Doe',
        bio: 'Content creator and developer passionate about open source',
        avatarUrl: 'https://example.com/avatar.jpg',
        socialLinks: {
          twitter: 'https://twitter.com/johndoe',
          github: 'https://github.com/johndoe',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(
    @Req() req: Request,
    @Body() updateDto: CreateProfileDto,
  ): Promise<User> {
    return this.profilesService.updateProfile(req.user!.id, updateDto);
  }

  @ApiOperation({ summary: 'Update social links on profile' })
  @ApiResponse({
    status: 200,
    description: 'Social links updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        socialLinks: {
          twitter: 'https://twitter.com/johndoe',
          github: 'https://github.com/johndoe',
          youtube: 'https://youtube.com/@johndoe',
          website: 'https://johndoe.com',
        },
        updatedAt: '2024-01-15T00:00:00Z',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/social-links')
  async updateSocialLinks(
    @Req() req: Request,
    @Body() socialLinksDto: UpdateSocialLinksDto,
  ): Promise<User> {
    return this.profilesService.updateSocialLinks(req.user!.id, socialLinksDto);
  }

  @ApiOperation({ summary: 'Upload profile avatar image' })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      example: {
        avatarUrl: 'https://example.com/avatars/123e4567-e89b-12d3-a456-426614174000.jpg',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/png|image\/webp)$/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: {
      mimetype: string;
      size: number;
      originalname: string;
      buffer: Buffer;
    },
  ): Promise<{ avatarUrl: string }> {
    const userId = req.user!.id;
    const avatarUrl = await this.profilesService.uploadAvatar(userId, file);
    return { avatarUrl };
  }
}
