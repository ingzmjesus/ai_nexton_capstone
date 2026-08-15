import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;
  let ticketsService: { create: jest.Mock };

  beforeEach(async () => {
    ticketsService = {
      create: jest.fn().mockResolvedValue({
        id: 'ticket_1',
        message: 'Help',
        createdAt: new Date('2026-08-15T00:00:00.000Z'),
        classification: {
          category: 'Other',
          priority: 'Low',
          sentiment: 'Neutral',
          summary: 'General support request requiring further triage.',
          suggestedTeam: 'General',
          requiresHumanReview: true,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: ticketsService }],
    }).compile();

    controller = module.get(TicketsController);
  });

  it('delegates create to TicketsService', async () => {
    const dto = { message: 'Help' };
    await expect(controller.create(dto)).resolves.toMatchObject({
      id: 'ticket_1',
      message: 'Help',
    });
    expect(ticketsService.create).toHaveBeenCalledWith(dto);
  });
});
