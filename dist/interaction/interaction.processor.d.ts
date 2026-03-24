import { InteractionEngine } from './interaction.types';
export declare class InteractionProcessor {
    private interactionEngine;
    constructor(interactionEngine: InteractionEngine);
    process(job: {
        data: any;
    }): Promise<any>;
}
