import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginStellarDto {
  @ApiProperty({ description: 'Stellar wallet public key (G...)', example: 'GABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({ description: 'Signed message for verification', example: 'Please sign this message to authenticate with StellarTip-Backend. Timestamp: 2024-01-01T00:00:00Z' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Base64-encoded Stellar signature', example: 'ABC123XYZ456DEF789GHI012JKL345MNO678PQR890STU123VWX456YZ==' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
