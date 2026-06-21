import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { sanitizeText } from '../../shared/sanitization/text-sanitizer';

export class CreateProfileDto {
  @ApiPropertyOptional({ description: 'Short bio', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => (value ? sanitizeText(value, 'bio') : value))
  bio?: string;

  @ApiPropertyOptional({ description: 'Display name shown on profile', maxLength: 60 })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  @Transform(({ value }) => (value ? sanitizeText(value, 'displayName') : value))
  displayName?: string;

  @ApiPropertyOptional({ description: 'URL to avatar image' })
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @IsOptional()
  avatarUrl?: string;
}
