import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiClassificationService } from './ai-classification.service';

@Module({
  imports: [HttpModule],
  providers: [AiClassificationService],
  exports: [AiClassificationService, HttpModule],
})
export class AiModule {}
