import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AiClassificationService } from './ai-classification.service';

describe('AiClassificationService', () => {
  const validContent = JSON.stringify({
    category: 'Account Access',
    priority: 'High',
    sentiment: 'Frustrated',
    summary: 'Password reset link is broken.',
    suggested_team: 'Account Support',
    requires_human_review: true,
  });

  function createService(httpPost: jest.Mock) {
    const http = { post: httpPost } as unknown as HttpService;
    const config = {
      get: (key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          'ollama.baseUrl': 'http://ollama.test',
          'ollama.model': 'llama3.2',
          'ollama.timeoutMs': 1000,
        };
        return values[key] ?? defaultValue;
      },
    } as ConfigService;

    return new AiClassificationService(http, config);
  }

  it('returns a validated classification from Ollama JSON', async () => {
    const post = jest.fn().mockReturnValue(
      of({
        data: { message: { content: validContent } },
      }),
    );
    const service = createService(post);

    await expect(
      service.classify('I cannot reset my password'),
    ).resolves.toMatchObject({
      category: 'AccountAccess',
      priority: 'High',
      suggestedTeam: 'AccountSupport',
      requiresHumanReview: true,
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('http://ollama.test/api/chat');
    expect(post.mock.calls[0][1]).toMatchObject({
      model: 'llama3.2',
      stream: false,
      format: 'json',
    });
  });

  it('retries once when the first AI payload is invalid', async () => {
    const post = jest
      .fn()
      .mockReturnValueOnce(
        of({ data: { message: { content: '{"category":"Nope"}' } } }),
      )
      .mockReturnValueOnce(
        of({ data: { message: { content: validContent } } }),
      );

    const service = createService(post);

    await expect(
      service.classify('I cannot reset my password'),
    ).resolves.toMatchObject({ category: 'AccountAccess' });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('throws BadGatewayException after a failed retry', async () => {
    const post = jest
      .fn()
      .mockReturnValue(
        of({ data: { message: { content: '{"category":"Nope"}' } } }),
      );

    const service = createService(post);

    await expect(service.classify('broken')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('throws BadGatewayException when Ollama is unreachable', async () => {
    const post = jest
      .fn()
      .mockReturnValue(throwError(() => new Error('connect ECONNREFUSED')));

    const service = createService(post);

    await expect(service.classify('hello')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws when message.content is missing', async () => {
    const post = jest.fn().mockReturnValue(of({ data: { message: {} } }));
    const service = createService(post);

    await expect(service.classify('hello')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
