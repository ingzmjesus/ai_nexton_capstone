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

  it('rejects non-object JSON values', () => {
    expect(() => parseAiClassificationJson('[]')).toThrow(
      ClassificationValidationError,
    );
    expect(() => parseAiClassificationJson('"string"')).toThrow(
      ClassificationValidationError,
    );
    expect(() => parseAiClassificationJson('null')).toThrow(
      ClassificationValidationError,
    );
  });

  it('rejects unknown category values', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        category: 'Not A Category',
      }),
    ).toThrow(/Invalid category/);
  });

  it('rejects unknown priority values', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        priority: 'Urgent',
      }),
    ).toThrow(/Invalid priority/);
  });

  it('rejects unknown sentiment values', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        sentiment: 'Angry',
      }),
    ).toThrow(/Invalid sentiment/);
  });

  it('rejects unknown suggested_team values', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        suggested_team: 'Legal',
      }),
    ).toThrow(/Invalid suggested_team/);
  });

  it('rejects empty string fields', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        summary: '   ',
      }),
    ).toThrow(/summary/);
  });

  it('rejects missing boolean fields', () => {
    expect(() =>
      validateAiClassification({
        ...valid,
        requires_human_review: 'yes',
      }),
    ).toThrow(/requires_human_review/);
  });

  it('accepts every approved category and team label', () => {
    const categories = [
      'Billing',
      'Account Access',
      'Technical Issue',
      'Product Question',
      'Refund',
      'Security',
      'Other',
    ];
    const teams = [
      'Billing',
      'Account Support',
      'Technical Support',
      'Product',
      'Security',
      'General',
    ];

    for (const category of categories) {
      expect(
        validateAiClassification({
          ...valid,
          category,
          suggested_team: 'General',
        }).category,
      ).toBeDefined();
    }

    for (const suggested_team of teams) {
      expect(
        validateAiClassification({
          ...valid,
          suggested_team,
        }).suggestedTeam,
      ).toBeDefined();
    }
  });
});
