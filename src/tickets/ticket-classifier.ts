import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from '../generated/prisma/client';

/** Internal classification result used before persistence / API mapping. */
export type ClassificationResult = {
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  summary: string;
  suggestedTeam: SuggestedTeam;
  requiresHumanReview: boolean;
};

export const TICKET_CLASSIFIER = Symbol('TICKET_CLASSIFIER');

export interface TicketClassifier {
  classify(message: string): Promise<ClassificationResult>;
}
