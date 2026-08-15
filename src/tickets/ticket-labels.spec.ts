import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  SENTIMENT_LABELS,
  TEAM_LABELS,
} from './ticket-labels';

describe('ticket-labels', () => {
  it('maps Prisma enums to product display labels', () => {
    expect(CATEGORY_LABELS.AccountAccess).toBe('Account Access');
    expect(PRIORITY_LABELS.Critical).toBe('Critical');
    expect(SENTIMENT_LABELS.Frustrated).toBe('Frustrated');
    expect(TEAM_LABELS.TechnicalSupport).toBe('Technical Support');
  });
});
