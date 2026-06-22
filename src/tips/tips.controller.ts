import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @Post()
  @TipCreationThrottle()
  async createTip(@Body() createTipDto: CreateTipDto): Promise<Tip> {
    if (!createTipDto.senderWallet && !createTipDto.transactionHash) {
      throw new BadRequestException(
        'senderWallet is required when no transactionHash is provided',
      );
    }
    return this.tipsService.createTip(createTipDto);
  }

  @ApiOperation({ summary: 'Get a tip by ID' })
  @Get(':id')
  async getTip(@Param('id') id: string): Promise<Tip> {
    return this.tipsService.getTipById(id);
  }

  @ApiOperation({ summary: 'Get tips received by the authenticated user' })
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
  @Post(':id/confirm')
  @TipCreationThrottle()
  async confirmTip(
    @Param('id') id: string,
    @Body('transactionHash') transactionHash: string,
  ): Promise<Tip> {
    return this.tipsService.confirmTip(id, transactionHash);
  }
}
