import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async complete(prompt: string, maxTokens = 200): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI completion');
    }
  }

  async summarize(text: string, maxLength = 100): Promise<string> {
    const prompt = `Summarize the following text in ${maxLength} words or less:\n\n${text}`;
    return this.complete(prompt, maxLength);
  }

  async suggestTasks(projectContext: string): Promise<string[]> {
    const prompt = `Given this project context: "${projectContext}", suggest 5 important tasks that should be completed. Return only the task titles, one per line.`;
    const response = await this.complete(prompt, 300);
    return response.split('\n').filter((line) => line.trim().length > 0);
  }
}