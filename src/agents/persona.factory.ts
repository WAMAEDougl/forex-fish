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

export class PersonaFactory {
  private static readonly PERSONAS: PersonaConfig[] = [
    {
      name: 'The Whale',
      persona: PersonaType.WHALE,
      risk_appetite: 0.8,
      strategy_type: StrategyType.LONG_TERM,
      capital: 1000000,
      description: 'Large institutional trader with deep pockets, moves markets',
      behavior_patterns: [
        'accumulates positions slowly',
        'trades with trend after confirmation',
        'ignores short-term volatility',
      ],
    },
    {
      name: 'The Panic Seller',
      persona: PersonaType.PANIC_SELLER,
      risk_appetite: 0.9,
      strategy_type: StrategyType.SHORT_TERM,
      capital: 50000,
      description: 'Fear-driven trader who exits at first sign of trouble',
      behavior_patterns: [
        'sells aggressively on negative news',
        'high emotional reactivity',
        'short holding periods',
      ],
    },
    {
      name: 'The Scalper',
      persona: PersonaType.SCALPER,
      risk_appetite: 0.3,
      strategy_type: StrategyType.SCALPING,
      capital: 10000,
      description: 'Quick in-and-out trader seeking tiny profits',
      behavior_patterns: [
        'very short holding periods (seconds to minutes)',
        'high frequency trades',
        'tight stop losses',
      ],
    },
    {
      name: 'The Momentum Trader',
      persona: PersonaType.MOMENTUM_TRADER,
      risk_appetite: 0.6,
      strategy_type: StrategyType.SHORT_TERM,
      capital: 100000,
      description: 'Rides the wave, enters after trend confirmation',
      behavior_patterns: [
        'enters on trend confirmation',
        'exits when momentum fades',
        'uses technical indicators',
      ],
    },
    {
      name: 'The Contrarian',
      persona: PersonaType.CONTRARIAN,
      risk_appetite: 0.7,
      strategy_type: StrategyType.SWING,
      capital: 250000,
      description: 'Goes against the crowd, buys fear sells greed',
      behavior_patterns: [
        'buys when others sell',
        'sells when market is euphoric',
        'high conviction trades',
      ],
    },
    {
      name: 'The News Trader',
      persona: PersonaType.NEWS_TRADER,
      risk_appetite: 0.5,
      strategy_type: StrategyType.NEWS_BASED,
      capital: 75000,
      description: 'Reacts to breaking news and economic releases',
      behavior_patterns: [
        'reacts to economic calendar events',
        'adjusts position based on surprise factor',
        'volatile around announcements',
      ],
    },
    {
      name: 'The Algorithmic',
      persona: PersonaType.ALGORITHMIC,
      risk_appetite: 0.2,
      strategy_type: StrategyType.SHORT_TERM,
      capital: 500000,
      description: 'Systematic trader following predefined rules',
      behavior_patterns: [
        'rule-based decision making',
        'consistent position sizing',
        'no emotional interference',
      ],
    },
  ];

  static getPersona(id: string, config: Partial<PersonaConfig> = {}): AgentPersona {
    const baseConfig = this.PERSONAS.find(p => p.persona === config.persona) || this.PERSONAS[0];
    
    return {
      id,
      name: config.name || baseConfig.name,
      persona: config.persona || baseConfig.persona,
      risk_appetite: config.risk_appetite ?? baseConfig.risk_appetite,
      strategy_type: config.strategy_type || baseConfig.strategy_type,
      capital: config.capital ?? baseConfig.capital,
    };
  }

  static getAllPersonas(): PersonaConfig[] {
    return [...this.PERSONAS];
  }

  static getRandomPersona(id: string): AgentPersona {
    const randomIndex = Math.floor(Math.random() * this.PERSONAS.length);
    return this.getPersona(id, { persona: this.PERSONAS[randomIndex].persona });
  }
}
