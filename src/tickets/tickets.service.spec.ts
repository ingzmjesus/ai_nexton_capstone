import {
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
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

describe('TicketsService (orchestration)', () => {
  let service: TicketsService;
  let prisma: {
    $transaction: jest.Mock;
    ticket: { create: jest.Mock };
    classification: { create: jest.Mock };
  };
  let classifier: { classify: jest.Mock };

  const classificationResult = {
    category: TicketCategory.AccountAccess,
    priority: TicketPriority.High,
    sentiment: TicketSentiment.Frustrated,
    summary: 'Password reset link is broken.',
    suggestedTeam: SuggestedTeam.AccountSupport,
    requiresHumanReview: true,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      ticket: { create: jest.fn() },
      classification: { create: jest.fn() },
    };
    classifier = {
      classify: jest.fn().mockResolvedValue(classificationResult),
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

  it('classifies, saves in a transaction, and returns the API response', async () => {
    const createdAt = new Date('2026-08-15T00:00:00.000Z');
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        ticket: {
          create: jest.fn().mockResolvedValue({
            id: 'ticket_1',
            message:
              'I cannot reset my password because the link does not work.',
            createdAt,
          }),
        },
        classification: {
          create: jest.fn().mockResolvedValue({
            ...classificationResult,
            ticketId: 'ticket_1',
          }),
        },
      }),
    );

    const result = await service.create({
      message: '  I cannot reset my password because the link does not work.  ',
    });

    expect(classifier.classify).toHaveBeenCalledWith(
      'I cannot reset my password because the link does not work.',
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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

  it('does not persist when classification fails', async () => {
    classifier.classify.mockRejectedValue(
      new BadGatewayException('Ticket classification failed'),
    );

    await expect(
      service.create({ message: 'I cannot reset my password' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid classification payloads before saving', async () => {
    classifier.classify.mockResolvedValue({
      ...classificationResult,
      summary: '',
    });

    await expect(
      service.create({ message: 'I cannot reset my password' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps unexpected classifier errors to BadGatewayException', async () => {
    classifier.classify.mockRejectedValue(new Error('boom'));

    await expect(
      service.create({ message: 'I cannot reset my password' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps non-Error classifier failures to BadGatewayException', async () => {
    classifier.classify.mockRejectedValue('string-failure');

    await expect(
      service.create({ message: 'I cannot reset my password' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only messages before classification', async () => {
    await expect(service.create({ message: '   ' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );

    expect(classifier.classify).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid enum fields before saving', async () => {
    classifier.classify.mockResolvedValue({
      ...classificationResult,
      category: 'NotReal' as never,
    });

    await expect(
      service.create({ message: 'I cannot reset my password' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps persistence failures to InternalServerErrorException', async () => {
    prisma.$transaction.mockRejectedValue(new Error('db down'));

    await expect(
      service.create({ message: 'I cannot reset my password' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(classifier.classify).toHaveBeenCalled();
  });
});
