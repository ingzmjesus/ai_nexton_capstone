# AI Support Ticket Classification System

## Goal

Build a backend API that receives a customer support ticket and uses
an AI model to classify it.

## Technology

- Node.js
- TypeScript
- NestJS
- Ollama as an alternative of AWS Bedrock
- PostgreSQL
- Prisma

## Ticket input

The API should accept:

{
  "message": "I can't reset my password because the link doesn't work."
}

## AI classification

The AI should return:

- category
- priority
- sentiment
- summary
- suggested_team
- requires_human_review

## Categories

- Billing
- Account Access
- Technical Issue
- Product Question
- Refund
- Security
- Other

## Priority

- Low
- Medium
- High
- Critical

## Requirements

1. Create POST /tickets.
2. Validate the request.
3. Send the ticket to the AI model.
4. Force the AI response to follow the expected JSON structure.
5. Validate the AI response.
6. Save the ticket and classification.
7. Return the classification to the client.
8. Add unit tests.
9. Keep the AI integration isolated in its own service.

## Important

Do not implement everything at once.
First analyze the existing project and propose an implementation plan.
