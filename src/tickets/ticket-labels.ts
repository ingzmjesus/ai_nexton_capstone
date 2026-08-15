import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from '../generated/prisma/client';

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.Billing]: 'Billing',
  [TicketCategory.AccountAccess]: 'Account Access',
  [TicketCategory.TechnicalIssue]: 'Technical Issue',
  [TicketCategory.ProductQuestion]: 'Product Question',
  [TicketCategory.Refund]: 'Refund',
  [TicketCategory.Security]: 'Security',
  [TicketCategory.Other]: 'Other',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.Low]: 'Low',
  [TicketPriority.Medium]: 'Medium',
  [TicketPriority.High]: 'High',
  [TicketPriority.Critical]: 'Critical',
};

export const SENTIMENT_LABELS: Record<TicketSentiment, string> = {
  [TicketSentiment.Positive]: 'Positive',
  [TicketSentiment.Neutral]: 'Neutral',
  [TicketSentiment.Negative]: 'Negative',
  [TicketSentiment.Frustrated]: 'Frustrated',
};

export const TEAM_LABELS: Record<SuggestedTeam, string> = {
  [SuggestedTeam.Billing]: 'Billing',
  [SuggestedTeam.AccountSupport]: 'Account Support',
  [SuggestedTeam.TechnicalSupport]: 'Technical Support',
  [SuggestedTeam.Product]: 'Product',
  [SuggestedTeam.Security]: 'Security',
  [SuggestedTeam.General]: 'General',
};
