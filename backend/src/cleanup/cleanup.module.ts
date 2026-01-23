import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { RepositoriesModule } from '../common/repositories/repositories.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [RepositoriesModule, ScheduleModule.forRoot()],
  providers: [CleanupService],
})
export class CleanupModule {}

