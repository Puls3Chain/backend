import { NestFactory } from '@nestjs/core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { readFileSync } from 'fs';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const config = new DocumentBuilder()
    .setTitle('StellarTip API')
    .setDescription('Generated API snapshot')
    .setVersion(pkg.version || '0.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('profiles', 'Creator profile management')
    .addTag('tips', 'Tip transactions and history')
    .addTag('stellar', 'Stellar blockchain interaction')
    .addTag('notifications', 'In-app notifications')
    .addTag('health', 'Health check and monitoring')
    .addServer('http://localhost:3000', 'Local development')
    .build();

  const document = SwaggerModule.createDocument(app, config as any);

  const outDir = join(process.cwd(), 'docs', 'openapi');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, 'current.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2), 'utf8');
  // Also write a human readable copy for debugging
  // eslint-disable-next-line no-console
  console.log('Wrote', outPath);
  await app.close();
}

void generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
