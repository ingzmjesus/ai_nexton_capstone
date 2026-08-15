import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export const TICKET_MESSAGE_MAX_LENGTH = 5000;

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(TICKET_MESSAGE_MAX_LENGTH)
  message!: string;
}
