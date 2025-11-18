import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { GoogleCalendarService } from './providers/google-calendar.service';
import { GithubService } from './providers/github.service';
import { SlackService } from './providers/slack.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [
    IntegrationsService,
    GoogleCalendarService,
    GithubService,
    SlackService,
  ],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}