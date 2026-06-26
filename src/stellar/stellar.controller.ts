import {
  Controller,
  Get,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StellarService } from './stellar.service';
import { StellarContractEventPayload } from './contract/events';

@ApiTags('stellar')
@Controller('stellar')
export class StellarController {
  private readonly logger = new Logger(StellarController.name);

  constructor(private readonly stellarService: StellarService) {}

  @ApiOperation({ summary: 'Get XLM and token balances for a wallet' })
  @Get('balance')
  async getBalance(
    @Query('walletAddress') walletAddress: string,
  ): Promise<{ balances: Array<{ asset: string; balance: string }> }> {
    if (!walletAddress) {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.stellarService.getAccountBalance(walletAddress);
  }

  @ApiOperation({ summary: 'Get Stellar account details' })
  @Get('account')
  async getAccount(@Query('walletAddress') walletAddress: string): Promise<{
    address: string;
    exists: boolean;
    sequenceNumber: string | null;
    subentryCount: number;
    network: string;
  }> {
    if (!walletAddress) {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.stellarService.getAccountInfo(walletAddress);
  }

  @ApiOperation({ summary: 'Verify a Stellar payment transaction' })
  @Post('verify-payment')
  async verifyPayment(
    @Body('transactionHash') transactionHash: string,
  ): Promise<{
    verified: boolean;
    from?: string;
    to?: string;
    amount?: number;
    asset?: string;
  }> {
    if (!transactionHash) {
      throw new HttpException(
        'transactionHash is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.stellarService.verifyPayment(transactionHash);
  }

  @ApiOperation({ summary: 'Ingest signed Soroban contract events' })
  @Post('contract/webhook')
  @HttpCode(HttpStatus.OK)
  async handleContractWebhook(
    @Body() payload: StellarContractEventPayload,
    @Headers('x-stellar-signature') signature: string | undefined,
    @Req() request: Request,
  ): Promise<{ accepted: true; duplicate: boolean }> {
    return this.stellarService.handleContractWebhook(
      payload,
      request.rawBody,
      signature,
    );
  }
}
