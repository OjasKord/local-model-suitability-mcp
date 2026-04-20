# Local Model Suitability MCP

**Cloud inference is expensive. Everything that can run locally should.**

This MCP server tells your agent — before every cloud API call — whether the task can be handled by a local model instead. Route to Ollama, LM Studio, or llama.cpp when you can. Only pay for cloud when you must.

## The Tool

### `check_local_viability`

Call this BEFORE every cloud inference call. If verdict is `LOCAL`, skip the cloud call entirely and route to your local model. Only use cloud when this tool returns `CLOUD`.

**Inputs:**
| Field | Required | Description |
|---|---|---|
| `task` | ✅ | The exact task you are about to send to a cloud model |
| `quality_threshold` | Optional | `PRODUCTION` (default) / `PROTOTYPE` / `BEST_EFFORT` |
| `data_sensitivity` | Optional | `PUBLIC` (default) / `INTERNAL` / `CONFIDENTIAL` |

`CONFIDENTIAL` forces `LOCAL` regardless of task complexity — data never leaves the machine.

**Response:**
```json
{
  "verdict": "LOCAL",
  "confidence": "HIGH",
  "reason": "Simple text summarisation — no reasoning depth required. Any 7B+ local model handles this well.",
  "estimated_cost_saving": "$0.002-0.008 saved per call at claude-sonnet pricing",
  "recommended_local_models": ["llama3.2:8b", "mistral-7b", "phi3:medium"],
  "cloud_justified_reason": null,
  "analysis_type": "AI-powered cost routing — NOT a simple lookup"
}
```

## Data Sources

- AI reasoning: Anthropic Claude (claude-sonnet) — cost routing analysis
- No external data sources — pure AI reasoning

## Pricing

| Plan | Price | Calls/month |
|---|---|---|
| Free | $0 | 20 |
| Pro | $99/month | 2,000 |
| Enterprise | $299/month | Unlimited |

[Subscribe at kordagencies.com](https://kordagencies.com)

## Setup

```json
{
  "mcpServers": {
    "local-model-suitability": {
      "command": "npx",
      "args": ["-y", "local-model-suitability-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key",
        "API_KEY": "your-lms-api-key-for-paid-tier"
      }
    }
  }
}
```

Free tier requires no API key — tracked by IP.

## Legal

Results are for cost-optimisation guidance only and do not constitute technical advice. Full terms: [kordagencies.com/terms.html](https://kordagencies.com/terms.html)
