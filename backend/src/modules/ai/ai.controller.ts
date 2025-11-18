import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('complete')
  async completeText(
    @Body('prompt') prompt: string,
    @Body('context') context?: string,
    @Body('maxTokens') maxTokens?: number,
  ) {
    return this.aiService.completeText(prompt, context, maxTokens);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('summarize')
  async summarizeText(
    @Body('text') text: string,
    @Body('maxLength') maxLength?: number,
  ) {
    return this.aiService.summarizeText(text, maxLength || 100);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('suggest-tasks')
  async suggestTasks(
    @Body('projectId') projectId: string,
    @Body('context') context: string,
  ) {
    return this.aiService.suggestTasks(projectId, context);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate-project-name')
  async generateProjectName(
    @Body('description') description: string,
  ) {
    return this.aiService.generateProjectName(description);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('analyze-sentiment')
  async analyzeSentiment(
    @Body('text') text: string,
  ) {
    return this.aiService.analyzeSentiment(text);
  }
}