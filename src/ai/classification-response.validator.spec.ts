import {
  ClassificationValidationError,
  parseAiClassificationJson,
  validateAiClassification,
} from './classification-response.validator';

describe('classification-response.validator', () => {
  const valid = {
    category: 'Account Access',
    priority: 'High',
    sentiment: 'Frustrated',
    summary: 'Password reset link is broken.',
    suggested_team: 'Account Support',
    requires_human_review: true,
  };

  it('parses and validates a correct AI payload', () => {
    const raw = parseAiClassificationJson(JSON.stringify(valid));
    expect(validateAiClassification(raw)).toEqual({
      category: 'AccountAccess',
      priority: 'High',
      sentiment: 'Frustrated',
      summary: 'Password reset link is broken.',
      suggestedTeam: 'AccountSupport',
      requiresHumanReview: true,
    });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseAiClassificationJson('not-json')).toThrow(
      ClassificationValidationError,
    );
  });

  it('rejects unknown enum values', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        category: 'Not A Category',
      }),
    ).toThrow(ClassificationValidationError);
  });

  it('rejects missing boolean fields', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        requires_human_review: 'yes',
      }),
    ).toThrow(ClassificationValidationError);
  });
});
