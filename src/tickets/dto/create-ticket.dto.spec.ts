import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateTicketDto,
  TICKET_MESSAGE_MAX_LENGTH,
} from './create-ticket.dto';

describe('CreateTicketDto', () => {
  it('accepts a valid message', async () => {
    const dto = plainToInstance(CreateTicketDto, {
      message: 'I cannot reset my password.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an empty message', async () => {
    const dto = plainToInstance(CreateTicketDto, { message: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a missing message', async () => {
    const dto = plainToInstance(CreateTicketDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a message that exceeds the max length', async () => {
    const dto = plainToInstance(CreateTicketDto, {
      message: 'x'.repeat(TICKET_MESSAGE_MAX_LENGTH + 1),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
