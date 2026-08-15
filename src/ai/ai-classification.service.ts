import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  ClassificationResult,
  TicketClassifier,
} from '../tickets/ticket-classifier';
import { CLASSIFICATION_SYSTEM_PROMPT } from './classification.prompt';
import {
  ClassificationValidationError,
  parseAiClassificationJson,
  validateAiClassification,
} from './classification-response.validator';

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

@Injectable()
export class AiClassificationService implements TicketClassifier {
  private readonly logger = new Logger(AiClassificationService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
  ) {
    this.baseUrl = configService
      .get<string>('ollama.baseUrl', 'http://localhost:11434')
      .replace(/\/$/, '');
    this.model = configService.get<string>('ollama.model', 'llama3.2');
    this.timeoutMs = configService.get<number>('ollama.timeoutMs', 60_000);
  }

  async classify(message: string): Promise<ClassificationResult> {
    try {
      return await this.classifyOnce(message);
    } catch (error) {
      if (error instanceof ClassificationValidationError) {
        this.logger.warn(
          `Invalid AI classification; retrying once: ${error.message}`,
        );
        try {
          return await this.classifyOnce(message);
        } catch (retryError) {
          throw this.toBadGateway(retryError);
        }
      }
      throw this.toBadGateway(error);
    }
  }

  private async classifyOnce(message: string): Promise<ClassificationResult> {
    const content = await this.callOllama(message);
    const raw = parseAiClassificationJson(content);
    return validateAiClassification(raw);
  }

  private async callOllama(message: string): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;

    try {
      const response = await firstValueFrom(
        this.http.post<OllamaChatResponse>(
          url,
          {
            model: this.model,
            stream: false,
            format: 'json',
            messages: [
              { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
              { role: 'user', content: message },
            ],
          },
          { timeout: this.timeoutMs },
        ),
      );

      const content = response.data?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new ClassificationValidationError(
          'Ollama response did not include message.content',
        );
      }

      return content;
    } catch (error) {
      if (error instanceof ClassificationValidationError) {
        throw error;
      }
      throw error;
    }
  }

  private toBadGateway(error: unknown): BadGatewayException {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown AI classification error';
    this.logger.error(`AI classification failed: ${message}`);
    return new BadGatewayException(`Ticket classification failed: ${message}`);
  }
}
