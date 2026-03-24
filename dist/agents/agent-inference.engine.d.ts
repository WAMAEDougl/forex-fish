import { AgentPersona, EconomicEventData, AgentInferenceResult } from '../common/interfaces/agent.interface';
import { KnowledgeGraph } from './knowledge-graph';
export declare class AgentInferenceEngine {
    private knowledgeGraph;
    constructor();
    infer(agent: AgentPersona, event: EconomicEventData): Promise<AgentInferenceResult>;
    private determineSentiment;
    private getBaseSentimentFromEvent;
    private getPersonaSentimentModifier;
    private calculatePriceBias;
    private determineTradeAction;
    private calculateConfidence;
    private generateReasoning;
    getKnowledgeGraph(): KnowledgeGraph;
}
