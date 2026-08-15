import { Module } from '@nestjs/common';
import { StubTicketClassifier } from './stub-ticket-classifier';
import { TICKET_CLASSIFIER } from './ticket-classifier';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [
    TicketsService,
    {
      provide: TICKET_CLASSIFIER,
      useClass: StubTicketClassifier,
    },
  ],
})
export class TicketsModule {}
