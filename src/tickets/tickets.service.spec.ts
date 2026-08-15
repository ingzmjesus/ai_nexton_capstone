import { Test, TestingModule } from '@nestjs/testing';
import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TICKET_CLASSIFIER } from './ticket-classifier';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: {
    ticket: { create: jest.Mock };
  };
  let classifier: { classify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      ticket: {
        create: jest.fn(),
      },
    };
    classifier = {
      classify: jest.fn().mockResolvedValue({
        category: TicketCategory.AccountAccess,
        priority: TicketPriority.High,
        sentiment: TicketSentiment.Frustrated,
        summary: 'Password reset link is broken.',
        suggestedTeam: SuggestedTeam.AccountSupport,
        requiresHumanReview: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TICKET_CLASSIFIER, useValue: classifier },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  it('classifies, persists, and returns the API response shape', async () => {
    const createdAt = new Date('2026-08-15T00:00:00.000Z');
    prisma.ticket.create.mockResolvedValue({
      id: 'ticket_1',
      message: 'I cannot reset my password because the link does not work.',
      createdAt,
      classification: {
        category: TicketCategory.AccountAccess,
        priority: TicketPriority.High,
        sentiment: TicketSentiment.Frustrated,
        summary: 'Password reset link is broken.',
        suggestedTeam: SuggestedTeam.AccountSupport,
        requiresHumanReview: true,
      },
    });

    const result = await service.create({
      message: '  I cannot reset my password because the link does not work.  ',
    });

    expect(classifier.classify).toHaveBeenCalledWith(
      'I cannot reset my password because the link does not work.',
    );
    expect(prisma.ticket.create).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'ticket_1',
      message: 'I cannot reset my password because the link does not work.',
      createdAt,
      classification: {
        category: 'Account Access',
        priority: 'High',
        sentiment: 'Frustrated',
        summary: 'Password reset link is broken.',
        suggestedTeam: 'Account Support',
        requiresHumanReview: true,
      },
    });
  });
});
