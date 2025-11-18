import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OpenAIApi, Configuration } from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async completeText(prompt: string, context?: string, maxTokens: number = 200) {
    try {
      // Prepare the prompt based on context
      let fullPrompt = prompt;
      
      if (context) {
        switch (context) {
          case 'task_description':
            fullPrompt = `Write a detailed task description: ${prompt}. Include acceptance criteria and any relevant details.`;
            break;
          case 'project_summary':
            fullPrompt = `Summarize this project in a few sentences: ${prompt}`;
            break;
          case 'comment_response':
            fullPrompt = `Write a helpful response to this comment: ${prompt}`;
            break;
          default:
            fullPrompt = prompt;
        }
      }

      const response = await this.openai.createCompletion({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-instruct',
        prompt: fullPrompt,
        max_tokens: maxTokens,
        temperature: 0.7,
        stop: ['\n\n', '###'],
      });

      return {
        completion: response.data.choices[0]?.text?.trim() || '',
        model: response.data.model,
        tokensUsed: response.data.usage?.total_tokens,
      };
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error}`);
      throw new BadRequestException('Failed to generate AI completion');
    }
  }

  async summarizeText(text: string, maxLength: number = 100) {
    try {
      const prompt = `Summarize the following text in ${maxLength} characters or less: ${text}`;
      
      const response = await this.openai.createCompletion({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-instruct',
        prompt: prompt,
        max_tokens: Math.floor(maxLength / 4), // Rough estimation: 1 token ~ 4 characters
        temperature: 0.5,
      });

      return {
        summary: response.data.choices[0]?.text?.trim() || '',
        originalLength: text.length,
        summaryLength: response.data.choices[0]?.text?.trim()?.length || 0,
      };
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error}`);
      throw new BadRequestException('Failed to generate summary');
    }
  }

  async suggestTasks(projectId: string, context: string) {
    try {
      const prompt = `Based on this project context: "${context}", suggest 5 relevant tasks that should be created for the project with ID ${projectId}. For each task, provide: title, description, priority (LOW/MEDIUM/HIGH), and estimated story points (1-8). Format as a JSON array.`;
      
      const response = await this.openai.createCompletion({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-instruct',
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7,
      });

      const rawResponse = response.data.choices[0]?.text?.trim() || '';
      let tasks = [];

      try {
        // Try to parse the response as JSON
        tasks = JSON.parse(rawResponse);
      } catch (parseError) {
        // If parsing fails, try to extract tasks in a different format
        this.logger.warn(`Failed to parse AI response as JSON: ${rawResponse}`);
        
        // Simple fallback: split by lines and create basic tasks
        const lines = rawResponse.split('\n').filter(line => line.trim() !== '');
        tasks = lines.map((line, index) => ({
          title: `Suggested Task ${index + 1}`,
          description: line,
          priority: 'MEDIUM',
          storyPoints: 3
        }));
      }

      return {
        suggestions: tasks,
        projectId,
      };
    } catch (error) {
      this.logger.error(`Error suggesting tasks: ${error}`);
      throw new BadRequestException('Failed to generate task suggestions');
    }
  }

  async generateProjectName(description: string) {
    try {
      const prompt = `Generate a short, descriptive project name (max 20 characters) for this project description: "${description}". Only return the name, nothing else.`;
      
      const response = await this.openai.createCompletion({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-instruct',
        prompt: prompt,
        max_tokens: 20,
        temperature: 0.6,
        stop: ['.', '\n'],
      });

      const name = response.data.choices[0]?.text?.trim() || 'New Project';
      
      return {
        name: name.replace(/[^a-zA-Z0-9\s-]/g, ''), // Sanitize the name
      };
    } catch (error) {
      this.logger.error(`Error generating project name: ${error}`);
      throw new BadRequestException('Failed to generate project name');
    }
  }

  async analyzeSentiment(text: string) {
    try {
      const prompt = `Analyze the sentiment of this text and rate it on a scale of -1 (very negative) to 1 (very positive): "${text}". Respond with only the number.`;
      
      const response = await this.openai.createCompletion({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-instruct',
        prompt: prompt,
        max_tokens: 10,
        temperature: 0.2,
      });

      const rawSentiment = response.data.choices[0]?.text?.trim() || '0';
      const sentiment = parseFloat(rawSentiment) || 0;
      
      let sentimentLabel = 'NEUTRAL';
      if (sentiment > 0.3) {
        sentimentLabel = 'POSITIVE';
      } else if (sentiment < -0.3) {
        sentimentLabel = 'NEGATIVE';
      }

      return {
        sentiment,
        label: sentimentLabel,
        confidence: Math.abs(sentiment),
      };
    } catch (error) {
      this.logger.error(`Error analyzing sentiment: ${error}`);
      throw new BadRequestException('Failed to analyze sentiment');
    }
  }
}