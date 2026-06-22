import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTipDto {
  @ApiProperty({ description: 'Stellar wallet address of the tip recipient', example: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ' })
  @IsString()
  @IsNotEmpty()
  receiverWallet: string;

  @ApiPropertyOptional({
    description: 'Stellar wallet address of the tip sender',
    example: 'GDEF789GHI012JKL345MNO678PQR890STU123VWX456YZA123BCD456EFG',
  })
  @IsString()
  @IsOptional()
  senderWallet?: string;

  @ApiProperty({ description: 'Tip amount', minimum: 0.0000001, example: 10.5 })
  @IsNumber()
  @Min(0.0000001)
  amount: number;

  @ApiPropertyOptional({ description: 'Optional message with the tip', example: 'Great content! Keep it up!' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Asset type: XLM or USDC',
    default: 'XLM',
    example: 'XLM',
  })
  @IsString()
  @IsOptional()
  asset?: string;

  @ApiPropertyOptional({
    description: 'Asset issuer address (required for USDC)',
    example: 'GA5ZSEJYB37JRC5BVHU4MWOOF7N2FDJQNEBVGTBRDPEKGBQ6776PQJJI',
  })
  @IsString()
  @IsOptional()
  assetIssuer?: string;

  @ApiPropertyOptional({
    description: 'Stellar transaction hash for on-chain verification',
    example: 'abc123def4567890123456789012345678901234567890123456789012345678',
  })
  @IsString()
  @IsOptional()
  transactionHash?: string;
}
