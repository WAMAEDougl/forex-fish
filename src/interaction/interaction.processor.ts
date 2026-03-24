import { Injectable } from '@nestjs/common';
import { InteractionEngine } from './interaction.types';

@Injectable()
export class InteractionProcessor {
  constructor(private interactionEngine: InteractionEngine) {}

  async process(job: { data: any }): Promise<any> {
    return this.interactionEngine.processInteraction(job);
  }
}