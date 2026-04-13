# Local Model Suitability MCP

**AI-powered evaluation of whether your local model is actually good enough for the task at hand.**

---

## The Problem

When you have both a local model (Ollama, LM Studio, etc.) and cloud APIs available, agents face a decision they cannot make intelligently alone:

**Should I run this locally or send it to the cloud?**

Getting this wrong in either direction is expensive:

- **Wrong direction 1 — cloud when local works:** You pay Claude Opus rates for a task a 7B model handles perfectly. At scale, this is thousands of dollars wasted monthly.
- **Wrong direction 2 — local when cloud is needed:** You run a complex reasoning task through a small model and get silent quality failures. The agent proceeds confidently on bad output.
- **Wrong direction 3 — cloud when data is sensitive:** You send confidential internal data to an external API that logs it. A privacy or compliance violation you never intended.

## The Solution

`evaluate_local_model_suitability` is a single AI-powered tool that reasons across four dimensions simultaneously — **cost, privacy, latency, and quality** — and returns a clear verdict your agent can act on.

```
Verdict: LOCAL | CLOUD | EITHER | NEITHER
```

This is not a benchmark lookup. Claude reasons about your specific task, your specific model, and your specific constraints.

---

## Installation

```bash
npx local-model-suitability-mcp
```

Or install globally:

```bash
npm install -g local-model-suitability-mcp
```

### Claude Desktop / Claude Code config

```json
{
  "mcpServers": {
    "local-model-suitability": {
      "command": "npx",
      "args": ["-y", "local-model-suitability-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

### With Pro API key

```json
{
  "mcpServers": {
    "local-model-suitability": {
      "command": "npx",
      "args": ["-y", "local-model-suitability-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "your-anthropic-key",
        "LMS_API_KEY": "your-pro-key-from-kordagencies"
      }
    }
  }
}
```

---

## Tool: `evaluate_local_model_suitability`

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `task_description` | string | ✅ | Describe the task specifically. Include output format, accuracy requirements, stakes. |
| `local_model` | string | ✅ | Model name in Ollama format: `llama3.1:8b`, `mistral:7b`, `qwen2.5:14b`, etc. |
| `quality_threshold` | enum | ✅ | `draft` / `production` / `critical` |
| `use_case_type` | enum | ✅ | `classification` / `summarisation` / `code_generation` / `reasoning` / `data_extraction` / `creative_writing` / `question_answering` / `translation` / `sentiment_analysis` / `other` |
| `data_sensitivity` | enum | ✅ | `public` / `internal` / `confidential` |
| `latency_requirement` | enum | ✅ | `flexible` / `moderate` / `realtime` |

### Example Request

```json
{
  "task_description": "Classify customer support emails into 5 categories: billing, technical, returns, complaints, general. Must be accurate enough for production routing — wrong classification means wrong team gets the ticket.",
  "local_model": "llama3.1:8b",
  "quality_threshold": "production",
  "use_case_type": "classification",
  "data_sensitivity": "internal",
  "latency_requirement": "moderate"
}
```

### Example Response

```json
{
  "verdict": "EITHER",
  "confidence": "HIGH",
  "summary": "Llama 3.1 8B can handle 5-category email classification at production quality if emails are clear — use local to protect customer data and save cost, with cloud fallback for ambiguous cases.",
  "model_evaluated": "llama3.1:8b",
  "model_profile": {
    "parameter_count": "8B",
    "tier": "small",
    "known_strengths": ["simple Q&A", "basic summarisation", "short classification", "data extraction"],
    "known_weaknesses": ["complex multi-step reasoning", "long-context coherence", "nuanced instruction following"]
  },
  "task_complexity": "SIMPLE",
  "reasoning": {
    "quality_assessment": "5-category classification is within 8B capability for well-structured emails. Performance degrades on ambiguous or multi-issue tickets.",
    "cost_impact": "Running locally saves approximately $0.003-0.008 per classification vs cloud. At 10,000 emails/month that is $30-80 saved monthly.",
    "privacy_assessment": "Customer support emails contain personal data. Keeping classification local avoids sending customer PII to external APIs — strong argument for local.",
    "latency_assessment": "Classification on an 8B model completes in 200-800ms depending on hardware. Meets moderate latency requirement.",
    "failure_modes": "Watch for: (1) multi-issue emails being misclassified to only one category, (2) sarcastic or informal language confusing the classifier, (3) very short one-word emails with no context."
  },
  "recommended_cloud_model": null,
  "fallback_advice": "If local classification confidence is low (detectable via logprobs or by asking the model to rate its own confidence), escalate to claude-haiku-3 for a second opinion — cheapest cloud model that handles ambiguous classification reliably.",
  "task_complexity": "SIMPLE",
  "analysis_type": "AI-powered — NOT a simple benchmark lookup",
  "free_tier_remaining": 17,
  "checked_at": "2026-04-13T10:22:31.000Z"
}
```

---

## Models With Built-in Knowledge

The following models have detailed capability profiles built in. All other models are assessed based on name and parameter patterns.

| Model | Params | Tier |
|---|---|---|
| llama3.1:8b | 8B | small |
| llama3.1:70b | 70B | large |
| llama3.1:405b | 405B | frontier |
| llama3.2:3b | 3B | tiny |
| mistral:7b | 7B | small |
| mixtral:8x7b | 47B | medium |
| qwen2.5:7b–72b | 7B–72B | small–large |
| gemma2:2b–27b | 2B–27B | tiny–medium |
| phi3:mini, phi3:medium, phi4 | 3.8B–14B | tiny–medium |
| deepseek-r1:8b–70b | 8B–70B | small–large |
| codellama:7b–34b | 7B–34B | small–large |
| deepseek-coder:6.7b–33b | 6.7B–33B | small–large |

---

## Pricing

| Tier | Price | Evaluations |
|---|---|---|
| Free | $0 | 20/month |
| Pro | $99/month | 2,000/month |
| Enterprise | $299/month | Unlimited |

Get your Pro key at [kordagencies.com](https://kordagencies.com)

---

## Privacy

We do not log or store your task descriptions, model names, or any query content. Each evaluation is processed and discarded. Full terms: [kordagencies.com/terms.html](https://kordagencies.com/terms.html)

---

Built by [Kord Agencies](https://kordagencies.com)
