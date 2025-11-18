import { Module } from '@nestjs/common';
import { PersonalTasksService } from './personal-tasks.service';
import { PersonalTasksController } from './personal-tasks.controller';
import { HabitsService } from './habits.service';
import { HabitsController } from './habits.controller';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [PersonalTasksService, HabitsService, JournalService],
  controllers: [PersonalTasksController, HabitsController, JournalController],
})
export class PersonalModule {}