import { PersonaType, StrategyType } from '../common/types/enums';
import { AgentPersona } from '../common/interfaces/agent.interface';
export interface PersonaConfig {
    name: string;
    persona: PersonaType;
    risk_appetite: number;
    strategy_type: StrategyType;
    capital: number;
    description: string;
    behavior_patterns: string[];
}
export declare class PersonaFactory {
    private static readonly PERSONAS;
    static getPersona(id: string, config?: Partial<PersonaConfig>): AgentPersona;
    static getAllPersonas(): PersonaConfig[];
    static getRandomPersona(id: string): AgentPersona;
}
