import asyncio
import os
import json
from typing import Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

app = FastAPI(title="Forex Agent Controller")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-4o-mini"

FOREX_PERSONAS = {
    "Whale": {
        "description": "Large institutional trader with long-term outlook, focusing on macro trends and significant capital deployment.",
        "style": "Strategic, patient, macro-focused",
    },
    "Scalper": {
        "description": "High-frequency trader seeking small profits from rapid price movements, very sensitive to micro-structure.",
        "style": "Quick, precise, technical",
    },
    "Fundamentalist": {
        "description": "Trader driven by economic data, news, and macroeconomic fundamentals. Values intrinsic value over technicals.",
        "style": "News-driven, analytical, macro-aware",
    },
    "Technical Analyst": {
        "description": "Trader who relies on chart patterns, indicators, and price action to make trading decisions.",
        "style": "Pattern-focused, indicator-based",
    },
    "Sentiment Trader": {
        "description": "Trader who gauges market mood from positioning, news sentiment, and crowd behavior.",
        "style": "Contrarian when extreme, flow-aware",
    },
}


class MarketDataInput(BaseModel):
    symbol: str
    bid: float
    ask: float
    spread: float
    time: int
    news: Optional[list[str]] = []
    indicators: Optional[dict[str, float]] = {}


class DebateResult(BaseModel):
    market_bias: str
    confidence_score: float
    reasoning: dict[str, Any]
    rounds: list[dict[str, Any]]


class AgentController:
    def __init__(self):
        self.client = None
        self._initialized = False

    async def initialize(self):
        if self._initialized:
            return

        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")

        self.client = AsyncOpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=OPENROUTER_API_KEY,
        )
        self._initialized = True

    def _build_system_prompt(self, persona_key: str) -> str:
        persona = FOREX_PERSONAS[persona_key]
        return f"""You are a {persona_key} trader in a Forex market debate.

Your profile:
- Description: {persona['description']}
- Trading style: {persona['style']}

Your role is to analyze market data and provide your trading view. 
Respond ONLY with valid JSON in this exact format:
{{
    "bias": "BULLISH" or "BEARISH" or "NEUTRAL",
    "confidence": 0.0 to 1.0,
    "reasoning": "2-3 sentence explanation",
    "key_factors": ["factor1", "factor2", "factor3"]
}}

Be honest and analytical. Don't always be bullish or bearish - let the data guide you."""

    def _build_debate_prompt(self, market_data: MarketDataInput, others_opinions: Optional[dict] = None) -> str:
        market_info = f"""
Current Market Data for {market_data.symbol}:
- Bid: {market_data.bid}
- Ask: {market_data.ask}
- Spread: {market_data.spread} pips
- Time: {market_data.time}
"""

        if market_data.news:
            market_info += f"\nRecent News:\n" + "\n".join(f"- {n}" for n in market_data.news[:5])

        if market_data.indicators:
            market_info += f"\nTechnical Indicators:\n"
            for k, v in market_data.indicators.items():
                market_info += f"- {k}: {v}\n"

        prompt = f"""Analyze this market data and provide your trading view:

{market_info}"""

        if others_opinions:
            prompt += f"""

Other traders' views:
{json.dumps(others_opinions, indent=2)}

Consider their perspectives and refine your view if warranted."""

        return prompt

    async def _call_agent(self, persona_key: str, prompt: str) -> dict:
        system_prompt = self._build_system_prompt(persona_key)

        response = await self.client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=500,
        )

        content = response.choices[0].message.content
        return self._parse_response(content)

    def _parse_response(self, content: str) -> dict:
        try:
            return json.loads(content)
        except:
            return {
                "bias": "NEUTRAL",
                "confidence": 0.5,
                "reasoning": content[:200] if content else "No response",
                "key_factors": []
            }

    async def run_debate(self, market_data: MarketDataInput, rounds: int = 3) -> DebateResult:
        await self.initialize()

        round_results = []
        agent_opinions = {}

        for round_num in range(1, rounds + 1):
            round_opinions = {}

            for persona_key in FOREX_PERSONAS.keys():
                others = {k: v for k, v in agent_opinions.items() if k != persona_key}
                prompt = self._build_debate_prompt(market_data, others if others else None)

                opinion = await self._call_agent(persona_key, prompt)
                round_opinions[persona_key] = opinion
                agent_opinions[persona_key] = opinion

            round_results.append({
                "round": round_num,
                "opinions": {k: {"bias": v["bias"], "confidence": v["confidence"], "reasoning": v["reasoning"][:100]}
                            for k, v in round_opinions.items()},
            })

        bias, confidence = self._aggregate_opinions(agent_opinions)

        return DebateResult(
            market_bias=bias,
            confidence_score=confidence,
            reasoning={
                "summary": f"3-round debate between {len(FOREX_PERSONAS)} agents",
                "agents": {k: v["reasoning"] for k, v in agent_opinions.items()},
            },
            rounds=round_results,
        )

    def _aggregate_opinions(self, opinions: dict[str, dict]) -> tuple[str, float]:
        bullish_count = 0
        bearish_count = 0
        neutral_count = 0
        total_confidence = 0.0

        for opinion in opinions.values():
            bias = opinion.get("bias", "NEUTRAL").upper()
            if bias == "BULLISH":
                bullish_count += 1
            elif bias == "BEARISH":
                bearish_count += 1
            else:
                neutral_count += 1
            total_confidence += opinion.get("confidence", 0.5)

        avg_confidence = total_confidence / len(opinions) if opinions else 0.5

        if bullish_count > bearish_count:
            return "BULLISH", avg_confidence
        elif bearish_count > bullish_count:
            return "BEARISH", avg_confidence
        else:
            return "NEUTRAL", avg_confidence


controller = AgentController()


@app.post("/analyze", response_model=DebateResult)
async def analyze_market(data: MarketDataInput):
    try:
        result = await controller.run_debate(data, rounds=3)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "healthy", "initialized": controller._initialized}


@app.post("/initialize")
async def initialize_agents():
    try:
        await controller.initialize()
        return {"status": "initialized", "agents": list(FOREX_PERSONAS.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)