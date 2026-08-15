import {
  BadGatewayException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from './../src/generated/prisma/client';
import { PrismaService } from './../src/prisma/prisma.service';
import { StubTicketClassifier } from './../src/tickets/stub-ticket-classifier';
import { TICKET_CLASSIFIER } from './../src/tickets/ticket-classifier';

describe('TicketsController (e2e)', () => {
  let app: INestApplication<App>;

  const classificationResult = {
    category: TicketCategory.AccountAccess,
    priority: TicketPriority.High,
    sentiment: TicketSentiment.Frustrated,
    summary: 'Customer is having trouble accessing their account.',
    suggestedTeam: SuggestedTeam.AccountSupport,
    requiresHumanReview: true,
  };

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        ticket: {
          create: jest.fn().mockImplementation(async ({ data }) => ({
            id: 'ticket_e2e_1',
            message: data.message,
            createdAt: new Date('2026-08-15T12:00:00.000Z'),
          })),
        },
        classification: {
          create: jest.fn().mockResolvedValue({
            ...classificationResult,
            ticketId: 'ticket_e2e_1',
          }),
        },
      }),
    ),
  };

  async function createApp(
    classifier: unknown,
  ): Promise<INestApplication<App>> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(TICKET_CLASSIFIER)
      .useValue(classifier)
      .compile();

    const nestApp = moduleFixture.createNestApplication();
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await nestApp.init();
    return nestApp;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createApp(new StubTicketClassifier());
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
    expect(prismaMock.$transaction).toHaveBeenCalled();
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

  it('POST /tickets returns 502 when classification fails', async () => {
    await app.close();
    app = await createApp({
      classify: jest
        .fn()
        .mockRejectedValue(
          new BadGatewayException('Ticket classification failed'),
        ),
    });

    await request(app.getHttpServer())
      .post('/tickets')
      .send({ message: 'I cannot reset my password' })
      .expect(502);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('GET /health still works', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });
});
