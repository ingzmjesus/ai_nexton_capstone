import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { StubTicketClassifier } from './../src/tickets/stub-ticket-classifier';
import { TICKET_CLASSIFIER } from './../src/tickets/ticket-classifier';
import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from './../src/generated/prisma/client';

describe('TicketsController (e2e)', () => {
  let app: INestApplication<App>;

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    ticket: {
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'ticket_e2e_1',
        message: data.message,
        createdAt: new Date('2026-08-15T12:00:00.000Z'),
        classification: {
          category: TicketCategory.AccountAccess,
          priority: TicketPriority.High,
          sentiment: TicketSentiment.Frustrated,
          summary: 'Customer is having trouble accessing their account.',
          suggestedTeam: SuggestedTeam.AccountSupport,
          requiresHumanReview: true,
        },
      })),
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(TICKET_CLASSIFIER)
      .useClass(StubTicketClassifier)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /tickets returns classification for a valid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/tickets')
      .send({
        message: 'I cannot reset my password because the link does not work.',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'ticket_e2e_1',
      message: 'I cannot reset my password because the link does not work.',
      classification: {
        category: 'Account Access',
        priority: 'High',
        sentiment: 'Frustrated',
        suggestedTeam: 'Account Support',
        requiresHumanReview: true,
      },
    });
    expect(response.body.createdAt).toBeDefined();
  });

  it('POST /tickets rejects an empty message', async () => {
    await request(app.getHttpServer())
      .post('/tickets')
      .send({ message: '' })
      .expect(400);
  });

  it('POST /tickets rejects a missing message', async () => {
    await request(app.getHttpServer()).post('/tickets').send({}).expect(400);
  });

  it('GET /health still works', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });
});
