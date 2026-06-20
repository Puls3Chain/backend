import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { SkipApiThrottle } from '../config/throttle.config';

@ApiTags('health')
@Controller('health')
@SkipApiThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T00:00:00Z',
        uptime: 3600,
        version: '1.0.0',
      },
    },
  })
  @Get()
  getHealth(): {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  } {
    return this.healthService.getHealth();
  }

  @ApiOperation({ summary: 'Readiness probe (checks database)' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      example: {
        status: 'ok',
        database: 'connected',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
    schema: {
      example: {
        status: 'error',
        database: 'disconnected',
      },
    },
  })
  @Get('ready')
  async getReady(@Res() res: Response): Promise<Response> {
    const result = await this.healthService.getReadiness();
    const statusCode =
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(result);
  }

  @ApiOperation({ summary: 'Remote health check (checks Stellar Horizon)' })
  @ApiResponse({
    status: 200,
    description: 'Remote services are healthy',
    schema: {
      example: {
        status: 'ok',
        horizon: 'connected',
        latency: 150,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Remote services are unhealthy',
    schema: {
      example: {
        status: 'error',
        horizon: 'disconnected',
      },
    },
  })
  @Get('remote')
  async getRemote(@Res() res: Response): Promise<Response> {
    const result = await this.healthService.getRemoteHealth();
    const statusCode =
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(result);
  }
}
