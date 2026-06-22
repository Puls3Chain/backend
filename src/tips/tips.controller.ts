import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TipsService, TipFilterOptions } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { Tip } from '../entities/tip.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TipCreationThrottle } from '../config/throttle.config';

@ApiTags('tips')
@Controller('tips')
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  @ApiOperation({ summary: 'Create a new tip' })
  @ApiResponse({
    status: 201,
    description: 'Tip created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        receiverWallet: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
        senderWallet: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
        amount: 10.5,
        message: 'Great content! Keep it up!',
        asset: 'XLM',
        assetIssuer: null,
        transactionHash: 'abc123def4567890123456789012345678901234567890123456789012345678',
        status: 'confirmed',
        createdAt: '2024-01-15T00:00:00Z',
      },
    },
  })
  @Post()
  @TipCreationThrottle()
  async createTip(@Body() createTipDto: CreateTipDto): Promise<Tip> {
    if (!createTipDto.senderWallet && !createTipDto.transactionHash) {
      throw new Error(
        'senderWallet is required when no transactionHash is provided',
      );
    }
    return this.tipsService.createTip(createTipDto);
  }

  @ApiOperation({ summary: 'Get a tip by ID' })
  @ApiResponse({
    status: 200,
    description: 'Tip retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        receiverWallet: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
        senderWallet: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
        amount: 10.5,
        message: 'Great content! Keep it up!',
        asset: 'XLM',
        assetIssuer: null,
        transactionHash: 'abc123def4567890123456789012345678901234567890123456789012345678',
        status: 'confirmed',
        createdAt: '2024-01-15T00:00:00Z',
      },
    },
  })
  @Get(':id')
  async getTip(@Param('id') id: string): Promise<Tip> {
    return this.tipsService.getTipById(id);
  }

  @ApiOperation({ summary: 'Get tips received by the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Tips retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            receiverWallet: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
            senderWallet: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
            amount: 10.5,
            message: 'Great content!',
            asset: 'XLM',
            status: 'confirmed',
            createdAt: '2024-01-15T00:00:00Z',
          },
        ],
        total: 150,
        page: 1,
        limit: 20,
        totalPages: 8,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/received')
  async getMyReceivedTips(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('asset') asset?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const filterOptions: TipFilterOptions = {
      page: +page,
      limit: +limit,
      startDate,
      endDate,
      asset,
      minAmount: minAmount ? +minAmount : undefined,
      maxAmount: maxAmount ? +maxAmount : undefined,
      sortBy,
      sortOrder,
    };

    return this.tipsService.getTipsByCreator(req.user!.id, filterOptions);
  }

  @ApiOperation({ summary: 'Get tips sent by the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Tips retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            receiverWallet: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
            senderWallet: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
            amount: 10.5,
            message: 'Great content!',
            asset: 'XLM',
            status: 'confirmed',
            createdAt: '2024-01-15T00:00:00Z',
          },
        ],
        total: 75,
        page: 1,
        limit: 20,
        totalPages: 4,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/sent')
  async getMySentTips(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('asset') asset?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const filterOptions: TipFilterOptions = {
      page: +page,
      limit: +limit,
      startDate,
      endDate,
      asset,
      minAmount: minAmount ? +minAmount : undefined,
      maxAmount: maxAmount ? +maxAmount : undefined,
      sortBy,
      sortOrder,
    };

    return this.tipsService.getTipsBySupporter(req.user!.id, filterOptions);
  }

  @ApiOperation({ summary: 'Get tips by wallet address' })
  @ApiResponse({
    status: 200,
    description: 'Tips retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            receiverWallet: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
            senderWallet: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
            amount: 10.5,
            message: 'Great content!',
            asset: 'XLM',
            status: 'confirmed',
            createdAt: '2024-01-15T00:00:00Z',
          },
        ],
        total: 200,
        page: 1,
        limit: 20,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    },
  })
  @Get('wallet/:walletAddress')
  async getTipsByWallet(
    @Param('walletAddress') walletAddress: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('asset') asset?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const filterOptions: TipFilterOptions = {
      page: +page,
      limit: +limit,
      startDate,
      endDate,
      asset,
      minAmount: minAmount ? +minAmount : undefined,
      maxAmount: maxAmount ? +maxAmount : undefined,
      sortBy,
      sortOrder,
    };
    return this.tipsService.getTipsByWallet(walletAddress, filterOptions);
  }

  @ApiOperation({ summary: 'Get tip statistics for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: [
        {
          totalAmount: '1250.5',
          totalTips: '150',
          asset: 'XLM',
          assetIssuer: null,
        },
        {
          totalAmount: '500',
          totalTips: '50',
          asset: 'USDC',
          assetIssuer: 'GA5ZSEJYB37JRC5BVHU4MWOOF7N2FDJQNEBVGTBRDPEKGBQ6776PQJJI',
        },
      ],
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/stats')
  async getMyStats(@Req() req: Request): Promise<
    Array<{
      totalAmount: string;
      totalTips: string;
      asset: string;
      assetIssuer: string | null;
    }>
  > {
    return this.tipsService.getTipStats(req.user!.id);
  }

  @ApiOperation({ summary: 'Confirm a tip with a transaction hash' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transactionHash: {
          type: 'string',
          example: 'abc123def4567890123456789012345678901234567890123456789012345678',
        },
      },
      required: ['transactionHash'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tip confirmed successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        receiverWallet: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
        senderWallet: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
        amount: 10.5,
        message: 'Great content! Keep it up!',
        asset: 'XLM',
        assetIssuer: null,
        transactionHash: 'abc123def4567890123456789012345678901234567890123456789012345678',
        status: 'confirmed',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:05:00Z',
      },
    },
  })
  @Post(':id/confirm')
  @TipCreationThrottle()
  async confirmTip(
    @Param('id') id: string,
    @Body('transactionHash') transactionHash: string,
  ): Promise<Tip> {
    return this.tipsService.confirmTip(id, transactionHash);
  }
}
