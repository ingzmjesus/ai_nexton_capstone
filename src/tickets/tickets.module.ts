import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiClassificationService } from '../ai/ai-classification.service';
import { AiModule } from '../ai/ai.module';
import { StubTicketClassifier } from './stub-ticket-classifier';
import { TICKET_CLASSIFIER } from './ticket-classifier';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [AiModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    StubTicketClassifier,
    {
      provide: TICKET_CLASSIFIER,
      inject: [ConfigService, AiClassificationService, StubTicketClassifier],
      useFactory: (
        config: ConfigService,
        ai: AiClassificationService,
        stub: StubTicketClassifier,
      ) => {
        const provider = config.get<string>('classifier.provider', 'ollama');
        return provider === 'stub' ? stub : ai;
      },
    },
  ],
})
export class TicketsModule {}
