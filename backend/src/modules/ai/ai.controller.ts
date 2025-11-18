import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('complete')
  async complete(
    @Body('prompt') prompt: string,
    @Body('maxTokens') maxTokens?: number,
  ) {
    return { completion: await this.aiService.complete(prompt, maxTokens) };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('summarize')
  async summarize(
    @Body('text') text: string,
    @Body('maxLength') maxLength?: number,
  ) {
    return { summary: await this.aiService.summarize(text, maxLength) };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('suggest-tasks')
  async suggestTasks(
    @Body('context') context: string,
  ) {
    return { suggestions: await this.aiService.suggestTasks(context) };
  }
}