import { IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSocialLinksDto {
  @ApiPropertyOptional({ description: 'Twitter profile URL (https://...)', example: 'https://twitter.com/johndoe' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  twitter?: string;

  @ApiPropertyOptional({ description: 'GitHub profile URL (https://...)', example: 'https://github.com/johndoe' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  github?: string;

  @ApiPropertyOptional({ description: 'YouTube channel URL (https://...)', example: 'https://youtube.com/@johndoe' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  youtube?: string;

  @ApiPropertyOptional({ description: 'Personal website URL (https://...)', example: 'https://johndoe.com' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  website?: string;
}
