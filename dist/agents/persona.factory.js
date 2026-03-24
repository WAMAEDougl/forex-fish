"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonaFactory = void 0;
const enums_1 = require("../common/types/enums");
class PersonaFactory {
    static getPersona(id, config = {}) {
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
    static getAllPersonas() {
        return [...this.PERSONAS];
    }
    static getRandomPersona(id) {
        const randomIndex = Math.floor(Math.random() * this.PERSONAS.length);
        return this.getPersona(id, { persona: this.PERSONAS[randomIndex].persona });
    }
}
exports.PersonaFactory = PersonaFactory;
PersonaFactory.PERSONAS = [
    {
        name: 'The Whale',
        persona: enums_1.PersonaType.WHALE,
        risk_appetite: 0.8,
        strategy_type: enums_1.StrategyType.LONG_TERM,
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
        persona: enums_1.PersonaType.PANIC_SELLER,
        risk_appetite: 0.9,
        strategy_type: enums_1.StrategyType.SHORT_TERM,
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
        persona: enums_1.PersonaType.SCALPER,
        risk_appetite: 0.3,
        strategy_type: enums_1.StrategyType.SCALPING,
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
        persona: enums_1.PersonaType.MOMENTUM_TRADER,
        risk_appetite: 0.6,
        strategy_type: enums_1.StrategyType.SHORT_TERM,
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
        persona: enums_1.PersonaType.CONTRARIAN,
        risk_appetite: 0.7,
        strategy_type: enums_1.StrategyType.SWING,
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
        persona: enums_1.PersonaType.NEWS_TRADER,
        risk_appetite: 0.5,
        strategy_type: enums_1.StrategyType.NEWS_BASED,
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
        persona: enums_1.PersonaType.ALGORITHMIC,
        risk_appetite: 0.2,
        strategy_type: enums_1.StrategyType.SHORT_TERM,
        capital: 500000,
        description: 'Systematic trader following predefined rules',
        behavior_patterns: [
            'rule-based decision making',
            'consistent position sizing',
            'no emotional interference',
        ],
    },
];
//# sourceMappingURL=persona.factory.js.map