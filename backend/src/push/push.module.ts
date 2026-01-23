import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { RepositoriesModule } from '../common/repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [PushController],
})
export class PushModule {}
