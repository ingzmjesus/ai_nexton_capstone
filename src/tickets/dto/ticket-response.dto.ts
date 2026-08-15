export class ClassificationResponseDto {
  category!: string;
  priority!: string;
  sentiment!: string;
  summary!: string;
  suggestedTeam!: string;
  requiresHumanReview!: boolean;
}

export class TicketResponseDto {
  id!: string;
  message!: string;
  createdAt!: Date;
  classification!: ClassificationResponseDto;
}
