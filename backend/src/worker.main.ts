import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');

  // Create an application context without starting an HTTP server.
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  logger.log('Worker application context initialized. BullMQ processors are now running.');

  // NOTE: We intentionally do not call app.close() so the process
  // stays alive to process queue jobs.
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Worker bootstrap failed', err);
  process.exit(1);
});
