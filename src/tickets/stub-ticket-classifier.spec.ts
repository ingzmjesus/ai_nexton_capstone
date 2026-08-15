import { StubTicketClassifier } from './stub-ticket-classifier';

describe('StubTicketClassifier', () => {
  const classifier = new StubTicketClassifier();

  it('classifies password issues as account access', async () => {
    await expect(
      classifier.classify('I cannot reset my password'),
    ).resolves.toMatchObject({
      category: 'AccountAccess',
      suggestedTeam: 'AccountSupport',
      requiresHumanReview: true,
    });
  });

  it('classifies refund requests as refund', async () => {
    await expect(
      classifier.classify('I want a refund for this charge'),
    ).resolves.toMatchObject({
      category: 'Refund',
      suggestedTeam: 'Billing',
    });
  });

  it('falls back to Other for unrecognized messages', async () => {
    await expect(classifier.classify('Hello there')).resolves.toMatchObject({
      category: 'Other',
      suggestedTeam: 'General',
    });
  });
});
