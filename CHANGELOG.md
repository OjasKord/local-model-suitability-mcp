# Changelog

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
