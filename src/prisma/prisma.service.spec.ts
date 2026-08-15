import { Test, TestingModule } from '@nestjs/testing';
import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from '../generated/prisma/client';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';

describe('PrismaService (persistence)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [PrismaService],
    }).compile();

    prisma = module.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a ticket with a classification', async () => {
    const ticket = await prisma.ticket.create({
      data: {
        message: 'I cannot reset my password because the link does not work.',
        classification: {
          create: {
            category: TicketCategory.AccountAccess,
            priority: TicketPriority.High,
            sentiment: TicketSentiment.Frustrated,
            summary: 'Password reset link is broken.',
            suggestedTeam: SuggestedTeam.AccountSupport,
            requiresHumanReview: true,
          },
        },
      },
      include: { classification: true },
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.message).toContain('password');
    expect(ticket.classification).toMatchObject({
      category: TicketCategory.AccountAccess,
      priority: TicketPriority.High,
      sentiment: TicketSentiment.Frustrated,
      suggestedTeam: SuggestedTeam.AccountSupport,
      requiresHumanReview: true,
    });

    await prisma.ticket.delete({ where: { id: ticket.id } });
  });
});
