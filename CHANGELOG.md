# Changelog

## [1.1.20] - 2026-06-20
- feat: email notification on free tier gate hit

## [1.1.19] - 2026-06-18
- feat: revoke API key on Stripe refund

## [1.1.18] - 2026-06-17
- fix: Resend fetch now logs HTTP error responses; was silently swallowing non-2xx failures

## [1.1.17] - 2026-06-17
- fix: Stripe webhook now validates payment_link ID — ignores events not belonging to this server

## [1.1.16] - 2026-06-16
- feat: ATO optimisation — purpose verb, usage context, required fields, ToolRank badge

## [1.1.15] - 2026-06-11
- feat: add /.well-known/mcp/server-card.json static metadata endpoint

## [1.1.14] - 2026-06-11
- fix: bump version past existing npm publish (1.1.13 already on registry)

## [1.1.13] - 2026-06-11
- feat: per-tool kill switch + per-minute rate limiting on AI tools

## [1.1.12] - 2026-06-08
- fix: BEFORE trigger language, consequence-first limit error

## [1.1.11] - 2026-06-05
- feat: Smithery optimisation - updated package.json description/keywords and smithery.yaml with system prompt

## [1.1.10] - 2026-06-04
- feat: /daily-report endpoint for consolidated daily summary

## [1.1.9] - 2026-06-04

### Added
- Upstash Redis persistence: free tier usage, API keys, session logs survive redeploys
- `loadFreeTierFromRedis()` / `saveFreeTierToRedis()` with Math.max merge (adapted for stats object structure)
- `saveKeyToRedis()` / `loadApiKeysFromRedis()` with prefix `lms`
- `appendSessionLog(ip, tool)` with 24h TTL per IP per day
- `/session-log` endpoint (requires x-stats-key)
- `free_tier_breakdown` per-IP object on `/stats` response for current month
- `getEffectiveLimit(ip)` helper — returns base + trial extension if applicable

### Changed
- `check_local_viability` tool description rewritten for orchestral agent runtime selection: state-based trigger, verdict consequences, DO NOT USE condition
- `VERSION` bumped to `1.1.9`

## [1.1.8] - 2026-06-02

### Fixed
- fix: IP extraction fixed for Cloudflare proxy headers — free tier gate now enforces correctly

## [1.1.5] - 2026-04-28

### Changed
- Payment links updated to prepaid bundle URLs: 500 calls for $20 -- calls never expire
- Free tier limit errors now direct agents to prepaid bundle purchase link directly

## [1.1.4] - 2026-04-27

### Added
- `token_count` field on all tool responses — lets orchestrator budget ledgers track token cost per call
- `/ready` endpoint — returns 200 when `ANTHROPIC_API_KEY` is present, 503 otherwise
- Phase 4 enhanced error objects: `category`, `retryable`, `retry_after_ms`, `fallback_tool`, `trace_id` on all error returns

## [1.1.3] - 2026-04-26

### Improved
- check_local_viability description rewritten with TCO framework: build-time consequence, exact cost signal, prepaid bundle pricing last
- Initialize serverInfo description rewritten for both HTTP and stdio transports
- Em dashes replaced with ASCII -- in description string

## [1.1.0] - 2026-04-20

### Changed
- Renamed tool from `evaluate_local_model_suitability` to `check_local_viability` — sharper, more action-oriented name
- Reframed core premise: cloud is expensive, local is the default, cloud must justify itself
- Tool description now positions as a cost gate to call BEFORE every cloud inference call

### Added
- `data_sensitivity` input: CONFIDENTIAL forces LOCAL verdict regardless of task — data never leaves the machine
- `quality_threshold` input: PRODUCTION / PROTOTYPE / BEST_EFFORT — controls how conservatively LOCAL verdicts are given
- `estimated_cost_saving` in response — approximate $ saved per call if routing LOCAL
- `recommended_local_models` — specific Ollama model names (e.g. llama3.2:8b, mistral-7b) when LOCAL or EITHER
- `cloud_justified_reason` — specific reason why local is insufficient, only present on CLOUD verdicts
- Partial response monetisation: free tier returns verdict + confidence + reason; paid adds cost savings + model recommendations

### Improved
- System prompt now takes a strong LOCAL-first stance — cloud must be justified, not the default
- More specific reasoning in responses — names the task type explicitly

## [1.0.4] - 2026-04-10

### Added
- HTTP POST MCP handler for dashboard tool counting
- STRIPE_WEBHOOK_SECRET signature verification
- RESEND_API_KEY for API key email delivery

## [1.0.1] - 2026-04-05

### Fixed
- Stats endpoint computing flat numbers for dashboard

## [1.0.0] - 2026-04-01

### Initial release
- evaluate_local_model_suitability tool
- Free 20/month | Pro $99/month | Enterprise $299/month
