import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TICKET_CLASSIFIER } from './ticket-classifier';
import type { TicketClassifier } from './ticket-classifier';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  SENTIMENT_LABELS,
  TEAM_LABELS,
} from './ticket-labels';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TICKET_CLASSIFIER)
    private readonly classifier: TicketClassifier,
  ) {}

  async create(dto: CreateTicketDto): Promise<TicketResponseDto> {
    const message = dto.message.trim();
    const classification = await this.classifier.classify(message);

    const ticket = await this.prisma.ticket.create({
      data: {
        message,
        classification: {
          create: {
            category: classification.category,
            priority: classification.priority,
            sentiment: classification.sentiment,
            summary: classification.summary,
            suggestedTeam: classification.suggestedTeam,
            requiresHumanReview: classification.requiresHumanReview,
          },
        },
      },
      include: { classification: true },
    });

    if (!ticket.classification) {
      throw new Error('Ticket was saved without a classification');
    }

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
