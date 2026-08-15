import { Injectable } from '@nestjs/common';
import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from '../generated/prisma/client';
import { ClassificationResult, TicketClassifier } from './ticket-classifier';

/**
 * Keyword-based classifier for offline testing.
 * Used when CLASSIFIER_PROVIDER=stub (default is Ollama via AiClassificationService).
 */
@Injectable()
export class StubTicketClassifier implements TicketClassifier {
  async classify(message: string): Promise<ClassificationResult> {
    const normalized = message.toLowerCase();

    if (
      normalized.includes('password') ||
      normalized.includes('login') ||
      normalized.includes('access')
    ) {
      return {
        category: TicketCategory.AccountAccess,
        priority: TicketPriority.High,
        sentiment: TicketSentiment.Frustrated,
        summary: 'Customer is having trouble accessing their account.',
        suggestedTeam: SuggestedTeam.AccountSupport,
        requiresHumanReview: true,
      };
    }

    if (normalized.includes('refund') || normalized.includes('charge')) {
      return {
        category: TicketCategory.Refund,
        priority: TicketPriority.Medium,
        sentiment: TicketSentiment.Negative,
        summary: 'Customer is requesting help with a refund or charge.',
        suggestedTeam: SuggestedTeam.Billing,
        requiresHumanReview: true,
      };
    }

    if (normalized.includes('bill') || normalized.includes('invoice')) {
      return {
        category: TicketCategory.Billing,
        priority: TicketPriority.Medium,
        sentiment: TicketSentiment.Neutral,
        summary: 'Customer has a billing-related question.',
        suggestedTeam: SuggestedTeam.Billing,
        requiresHumanReview: false,
      };
    }

    return {
      category: TicketCategory.Other,
      priority: TicketPriority.Low,
      sentiment: TicketSentiment.Neutral,
      summary: 'General support request requiring further triage.',
      suggestedTeam: SuggestedTeam.General,
      requiresHumanReview: true,
    };
  }
}
