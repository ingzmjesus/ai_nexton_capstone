import {
  SuggestedTeam,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
} from '../generated/prisma/client';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  SENTIMENT_LABELS,
  TEAM_LABELS,
} from '../tickets/ticket-labels';
import type { ClassificationResult } from '../tickets/ticket-classifier';

const CATEGORY_BY_LABEL = invert(CATEGORY_LABELS);
const PRIORITY_BY_LABEL = invert(PRIORITY_LABELS);
const SENTIMENT_BY_LABEL = invert(SENTIMENT_LABELS);
const TEAM_BY_LABEL = invert(TEAM_LABELS);

function invert<T extends string>(
  labels: Record<T, string>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(labels).map(([key, label]) => [label, key]),
  ) as Record<string, T>;
}

export type RawAiClassification = {
  category?: unknown;
  priority?: unknown;
  sentiment?: unknown;
  summary?: unknown;
  suggested_team?: unknown;
  requires_human_review?: unknown;
};

export class ClassificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassificationValidationError';
  }
}

export function parseAiClassificationJson(
  content: string,
): RawAiClassification {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ClassificationValidationError('AI response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ClassificationValidationError(
      'AI response must be a JSON object',
    );
  }

  return parsed as RawAiClassification;
}

export function validateAiClassification(
  raw: RawAiClassification,
): ClassificationResult {
  const categoryLabel = requireString(raw.category, 'category');
  const priorityLabel = requireString(raw.priority, 'priority');
  const sentimentLabel = requireString(raw.sentiment, 'sentiment');
  const summary = requireString(raw.summary, 'summary');
  const teamLabel = requireString(raw.suggested_team, 'suggested_team');
  const requiresHumanReview = requireBoolean(
    raw.requires_human_review,
    'requires_human_review',
  );

  const category = CATEGORY_BY_LABEL[categoryLabel];
  if (!category) {
    throw new ClassificationValidationError(
      `Invalid category: ${categoryLabel}`,
    );
  }

  const priority = PRIORITY_BY_LABEL[priorityLabel];
  if (!priority) {
    throw new ClassificationValidationError(
      `Invalid priority: ${priorityLabel}`,
    );
  }

  const sentiment = SENTIMENT_BY_LABEL[sentimentLabel];
  if (!sentiment) {
    throw new ClassificationValidationError(
      `Invalid sentiment: ${sentimentLabel}`,
    );
  }

  const suggestedTeam = TEAM_BY_LABEL[teamLabel];
  if (!suggestedTeam) {
    throw new ClassificationValidationError(
      `Invalid suggested_team: ${teamLabel}`,
    );
  }

  return {
    category: category as TicketCategory,
    priority: priority as TicketPriority,
    sentiment: sentiment as TicketSentiment,
    summary,
    suggestedTeam: suggestedTeam as SuggestedTeam,
    requiresHumanReview,
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ClassificationValidationError(
      `Field "${field}" must be a non-empty string`,
    );
  }
  return value.trim();
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ClassificationValidationError(
      `Field "${field}" must be a boolean`,
    );
  }
  return value;
}
