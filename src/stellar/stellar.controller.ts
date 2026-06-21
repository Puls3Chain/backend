import {
  Controller,
  Get,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  Post,
  Body,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { StellarService } from './stellar.service';

@ApiTags('stellar')
@Version('1')
@Controller('stellar')
export class StellarController {
  private readonly logger = new Logger(StellarController.name);

  constructor(private readonly stellarService: StellarService) {}

  @ApiOperation({ summary: 'Get XLM and token balances for a wallet' })
  @ApiResponse({
    status: 200,
    description: 'Balances retrieved successfully',
    schema: {
      example: {
        balances: [
          { asset: 'XLM', balance: '1000.5' },
          { asset: 'USDC', balance: '500.25', issuer: 'GA5ZSEJYB37JRC5BVHU4MWOOF7N2FDJQNEBVGTBRDPEKGBQ6776PQJJI' },
        ],
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Account details retrieved successfully',
    schema: {
      example: {
        address: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
        exists: true,
        sequenceNumber: '1234567890',
        subentryCount: 5,
        network: 'public',
      },
    },
  })
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
    description: 'Payment verification result',
    schema: {
      example: {
        verified: true,
        from: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
        to: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ',
        amount: 10.5,
        asset: 'XLM',
      },
    },
  })
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
}
