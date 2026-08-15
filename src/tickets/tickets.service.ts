import {
  BadGatewayException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TICKET_CLASSIFIER } from './ticket-classifier';
import type {
  ClassificationResult,
  TicketClassifier,
} from './ticket-classifier';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  SENTIMENT_LABELS,
  TEAM_LABELS,
} from './ticket-labels';

type PersistedTicket = {
  id: string;
  message: string;
  createdAt: Date;
  classification: {
    category: TicketCategory;
    priority: TicketPriority;
    sentiment: TicketSentiment;
    summary: string;
    suggestedTeam: SuggestedTeam;
    requiresHumanReview: boolean;
  };
};

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(TICKET_CLASSIFIER)
    private readonly classifier: TicketClassifier,
  ) {}

  /**
   * Orchestrates: validate input → classify → validate classification →
   * transactional save → return API response.
   */
  async create(dto: CreateTicketDto): Promise<TicketResponseDto> {
    // 1) Validate / normalize input (DTO already validated by ValidationPipe)
    const message = this.normalizeMessage(dto.message);

    // 2) Classify with the isolated AI (or stub) provider
    const classification = await this.classifyMessage(message);

    // 3) Validate classification result before any persistence
    this.assertValidClassification(classification);

    // 4) Persist ticket + classification atomically
    const ticket = await this.saveTicketWithClassification(
      message,
      classification,
    );

    // 5) Return the API response
    return this.toResponse(ticket);
  }

  private normalizeMessage(message: string): string {
    const normalized = message.trim();
    if (!normalized) {
      // Defense in depth; ValidationPipe should already reject this.
      throw new InternalServerErrorException('Ticket message is empty');
    }
    return normalized;
  }

  private async classifyMessage(
    message: string,
  ): Promise<ClassificationResult> {
    try {
      return await this.classifier.classify(message);
    } catch (error) {
      // Preserve BadGatewayException from AiClassificationService.
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(
        `Classifier failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadGatewayException('Ticket classification failed');
    }
  }

  private assertValidClassification(
    classification: ClassificationResult,
  ): void {
    const validCategory = Object.values(TicketCategory).includes(
      classification.category,
    );
    const validPriority = Object.values(TicketPriority).includes(
      classification.priority,
    );
    const validSentiment = Object.values(TicketSentiment).includes(
      classification.sentiment,
    );
    const validTeam = Object.values(SuggestedTeam).includes(
      classification.suggestedTeam,
    );
    const validSummary =
      typeof classification.summary === 'string' &&
      classification.summary.trim().length > 0;
    const validReviewFlag =
      typeof classification.requiresHumanReview === 'boolean';

    if (
      !validCategory ||
      !validPriority ||
      !validSentiment ||
      !validTeam ||
      !validSummary ||
      !validReviewFlag
    ) {
      this.logger.error(
        `Classification failed orchestration validation: ${JSON.stringify(classification)}`,
      );
      throw new BadGatewayException(
        'Ticket classification failed: invalid classification payload',
      );
    }
  }

  private async saveTicketWithClassification(
    message: string,
    classification: ClassificationResult,
  ): Promise<PersistedTicket> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: { message },
        });

        const savedClassification = await tx.classification.create({
          data: {
            ticketId: ticket.id,
            category: classification.category,
            priority: classification.priority,
            sentiment: classification.sentiment,
            summary: classification.summary,
            suggestedTeam: classification.suggestedTeam,
            requiresHumanReview: classification.requiresHumanReview,
          },
        });

        return {
          id: ticket.id,
          message: ticket.message,
          createdAt: ticket.createdAt,
          classification: savedClassification,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist ticket: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        'Failed to save ticket classification',
      );
    }
  }

  private toResponse(ticket: PersistedTicket): TicketResponseDto {
    return {
      id: ticket.id,
      message: ticket.message,
      createdAt: ticket.createdAt,
      classification: {
        category: CATEGORY_LABELS[ticket.classification.category],
        priority: PRIORITY_LABELS[ticket.classification.priority],
        sentiment: SENTIMENT_LABELS[ticket.classification.sentiment],
        summary: ticket.classification.summary,
        suggestedTeam: TEAM_LABELS[ticket.classification.suggestedTeam],
        requiresHumanReview: ticket.classification.requiresHumanReview,
      },
    };
  }
}
