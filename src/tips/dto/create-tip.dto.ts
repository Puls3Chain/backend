import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { sanitizeText } from '../../shared/sanitization/text-sanitizer';

export class CreateTipDto {
  @ApiProperty({ description: 'Stellar wallet address of the tip recipient' })
  @IsString()
  @IsNotEmpty()
  receiverWallet: string;

  @ApiPropertyOptional({
    description: 'Stellar wallet address of the tip sender',
  })
  @IsString()
  @IsOptional()
  senderWallet?: string;

  @ApiProperty({ description: 'Tip amount', minimum: 0.0000001 })
  @IsNumber()
  @Min(0.0000001)
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional message with the tip',
    maxLength: 280,
  })
  @IsString()
  @IsOptional()
  @MaxLength(280)
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string'
      ? sanitizeText(value, 'message')
      : (value as unknown),
  )
  message?: string;

  @ApiPropertyOptional({
    description: 'Asset type: XLM or USDC',
    default: 'XLM',
  })
  @IsString()
  @IsOptional()
  asset?: string;

  @ApiPropertyOptional({
    description: 'Asset issuer address (required for USDC)',
  })
  @IsString()
  @IsOptional()
  assetIssuer?: string;

  @ApiPropertyOptional({
    description: 'Stellar transaction hash for on-chain verification',
  })
  @IsString()
  @IsOptional()
  transactionHash?: string;
}
