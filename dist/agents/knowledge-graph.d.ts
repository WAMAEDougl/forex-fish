import { GraphRAGContext, KnowledgeGraphNode, KnowledgeGraphEdge } from '../common/interfaces/agent.interface';
export declare class KnowledgeGraph {
    private nodes;
    private edges;
    constructor();
    private initializeBaseKnowledge;
    private categorizeImpact;
    addNode(node: KnowledgeGraphNode): void;
    addEdge(edge: KnowledgeGraphEdge): void;
    queryRelevantFactors(currencyPair: string, eventType: string): GraphRAGContext;
    private deriveRelevantFactors;
    getNode(id: string): KnowledgeGraphNode | undefined;
    getAllNodes(): KnowledgeGraphNode[];
}
