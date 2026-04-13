#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ─── Constants ───────────────────────────────────────────────────────────────

const VERSION = '1.0.0';
const FREE_TIER_LIMIT = 20;
const STATS_FILE = '/tmp/lms_stats.json';

const LEGAL_DISCLAIMER =
  'Results are AI-powered assessments based on known model benchmarks and capabilities. ' +
  'We do not log or store your query content. ' +
  'Results are for informational purposes only and do not constitute technical guarantees. ' +
  'Operator must independently validate model output quality for production workloads. ' +
  'Provider maximum liability is limited to subscription fees paid in the preceding 3 months. ' +
  'Full terms: kordagencies.com/terms.html';

function nowISO() {
  return new Date().toISOString();
}

// ─── Stats persistence ────────────────────────────────────────────────────────

function loadStats() {
  try {
    if (existsSync(STATS_FILE)) {
      return JSON.parse(readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (_) {}
  return {
    total_requests: 0,
    tool_usage: { evaluate_local_model_suitability: 0 },
    free_tier_calls_by_ip: {},
    start_time: nowISO(),
  };
}

function saveStats(stats) {
  try {
    writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (_) {}
}

const stats = loadStats();

// ─── Free tier enforcement ────────────────────────────────────────────────────

function checkFreeTier(apiKey, clientIp) {
  if (apiKey) return { allowed: true, paid: true };
  const key = clientIp || 'unknown';
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!stats.free_tier_calls_by_ip[key]) stats.free_tier_calls_by_ip[key] = {};
  const monthCalls = stats.free_tier_calls_by_ip[key][monthKey] || 0;
  if (monthCalls >= FREE_TIER_LIMIT) {
    return { allowed: false, paid: false, used: monthCalls };
  }
  stats.free_tier_calls_by_ip[key][monthKey] = monthCalls + 1;
  saveStats(stats);
  return { allowed: true, paid: false, remaining: FREE_TIER_LIMIT - monthCalls - 1 };
}

// ─── Model knowledge base ─────────────────────────────────────────────────────

const MODEL_KNOWLEDGE = {
  // Llama family
  'llama3.1:8b':   { params: '8B',  tier: 'small',  strengths: ['simple Q&A', 'basic summarisation', 'short classification', 'data extraction'], weaknesses: ['complex multi-step reasoning', 'long-context coherence', 'nuanced instruction following', 'code generation beyond simple scripts'], context_window: 128000 },
  'llama3.1:70b':  { params: '70B', tier: 'large',  strengths: ['complex reasoning', 'code generation', 'nuanced analysis', 'long-context tasks'], weaknesses: ['frontier-level reasoning', 'very specialised domain knowledge'], context_window: 128000 },
  'llama3.1:405b': { params: '405B',tier: 'frontier',strengths: ['frontier reasoning', 'complex code', 'deep analysis', 'long-context coherence'], weaknesses: ['hardware requirements are extreme'], context_window: 128000 },
  'llama3.2:3b':   { params: '3B',  tier: 'tiny',   strengths: ['very simple classification', 'keyword extraction', 'structured data parsing'], weaknesses: ['any reasoning', 'multi-step tasks', 'creative generation', 'code'], context_window: 128000 },
  'llama3.2:1b':   { params: '1B',  tier: 'tiny',   strengths: ['simple keyword extraction', 'basic yes/no classification'], weaknesses: ['almost everything beyond trivial tasks'], context_window: 128000 },

  // Mistral family
  'mistral:7b':        { params: '7B',  tier: 'small',  strengths: ['instruction following', 'simple reasoning', 'structured output', 'European language tasks'], weaknesses: ['complex multi-step reasoning', 'long document analysis'], context_window: 32000 },
  'mixtral:8x7b':      { params: '47B', tier: 'medium', strengths: ['strong reasoning', 'code generation', 'multilingual', 'structured output'], weaknesses: ['frontier reasoning', 'very long contexts'], context_window: 32000 },
  'mistral-nemo:12b':  { params: '12B', tier: 'small',  strengths: ['instruction following', 'simple to medium reasoning', 'multilingual'], weaknesses: ['complex reasoning', 'long-context tasks'], context_window: 128000 },

  // Qwen family
  'qwen2.5:7b':   { params: '7B',  tier: 'small',  strengths: ['coding', 'maths', 'structured output', 'multilingual'], weaknesses: ['complex reasoning', 'long-context coherence'], context_window: 128000 },
  'qwen2.5:14b':  { params: '14B', tier: 'medium', strengths: ['strong coding', 'maths', 'reasoning', 'multilingual'], weaknesses: ['frontier-level reasoning'], context_window: 128000 },
  'qwen2.5:32b':  { params: '32B', tier: 'large',  strengths: ['excellent coding', 'maths', 'complex reasoning', 'multilingual'], weaknesses: ['frontier reasoning on very hard tasks'], context_window: 128000 },
  'qwen2.5:72b':  { params: '72B', tier: 'large',  strengths: ['frontier-adjacent reasoning', 'coding', 'maths', 'long context'], weaknesses: ['hardware requirements are high'], context_window: 128000 },

  // Gemma family
  'gemma2:2b':  { params: '2B',  tier: 'tiny',   strengths: ['simple classification', 'short Q&A', 'keyword extraction'], weaknesses: ['reasoning', 'multi-step tasks', 'code'], context_window: 8192 },
  'gemma2:9b':  { params: '9B',  tier: 'small',  strengths: ['instruction following', 'simple reasoning', 'coding basics'], weaknesses: ['complex reasoning', 'long contexts'], context_window: 8192 },
  'gemma2:27b': { params: '27B', tier: 'medium', strengths: ['solid reasoning', 'code generation', 'analysis'], weaknesses: ['frontier reasoning'], context_window: 8192 },

  // Phi family
  'phi3:mini':   { params: '3.8B', tier: 'tiny',   strengths: ['simple reasoning', 'code snippets', 'structured output'], weaknesses: ['complex multi-step tasks', 'long contexts'], context_window: 128000 },
  'phi3:medium': { params: '14B',  tier: 'medium', strengths: ['reasoning', 'coding', 'maths', 'instruction following'], weaknesses: ['frontier reasoning'], context_window: 128000 },
  'phi4':        { params: '14B',  tier: 'medium', strengths: ['strong reasoning', 'coding', 'maths', 'structured output'], weaknesses: ['frontier reasoning on hardest tasks'], context_window: 16000 },

  // Code-specific
  'codellama:7b':  { params: '7B',  tier: 'small',  strengths: ['code completion', 'simple code generation', 'code explanation'], weaknesses: ['complex architecture', 'multi-file reasoning', 'debugging complex bugs'], context_window: 16000 },
  'codellama:34b': { params: '34B', tier: 'large',  strengths: ['complex code generation', 'multi-language', 'architecture reasoning'], weaknesses: ['frontier coding tasks'], context_window: 16000 },
  'deepseek-coder:6.7b': { params: '6.7B', tier: 'small', strengths: ['code generation', 'code explanation', 'simple debugging'], weaknesses: ['complex multi-file reasoning'], context_window: 16000 },
  'deepseek-coder:33b':  { params: '33B', tier: 'large',  strengths: ['complex code generation', 'debugging', 'architecture'], weaknesses: ['frontier coding'], context_window: 16000 },

  // DeepSeek R1 family
  'deepseek-r1:8b':  { params: '8B',  tier: 'small',  strengths: ['reasoning with chain-of-thought', 'maths', 'simple logic'], weaknesses: ['complex domain knowledge', 'very hard reasoning'], context_window: 128000 },
  'deepseek-r1:32b': { params: '32B', tier: 'large',  strengths: ['strong reasoning', 'maths', 'coding', 'logic'], weaknesses: ['frontier reasoning'], context_window: 128000 },
  'deepseek-r1:70b': { params: '70B', tier: 'large',  strengths: ['frontier-adjacent reasoning', 'maths', 'complex coding'], weaknesses: ['hardware requirements are very high'], context_window: 128000 },
};

function lookupModel(modelName) {
  const normalized = modelName.toLowerCase().trim();
  if (MODEL_KNOWLEDGE[normalized]) return MODEL_KNOWLEDGE[normalized];
  // Fuzzy match — strip version tags like :latest
  const base = normalized.replace(/:latest$/, '');
  for (const key of Object.keys(MODEL_KNOWLEDGE)) {
    if (key.startsWith(base) || base.startsWith(key.split(':')[0])) {
      return MODEL_KNOWLEDGE[key];
    }
  }
  return null;
}

// ─── Claude brain ─────────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function evaluateWithClaude(params) {
  const {
    task_description,
    local_model,
    quality_threshold,
    use_case_type,
    data_sensitivity,
    latency_requirement,
    model_info,
  } = params;

  const systemPrompt = `You are an expert in LLM capabilities and deployment strategy. 
Your job is to give AI agents a clear, honest verdict on whether a specific local model 
is suitable for a specific task — so agents can make intelligent decisions about 
cost, privacy, latency, and quality without guessing.

You understand the real-world capability gaps between model sizes and how they affect 
production workloads. You do not hedge excessively. You give a clear verdict with 
clear reasoning that an agent can act on immediately.

Always respond in valid JSON only. No markdown, no preamble.`;

  const userPrompt = `Evaluate whether this local model is suitable for this task.

TASK: ${task_description}
LOCAL MODEL: ${local_model}
${model_info ? `MODEL PROFILE: ${JSON.stringify(model_info)}` : 'MODEL PROFILE: Unknown model — assess based on name/size patterns'}
QUALITY THRESHOLD: ${quality_threshold} (draft=errors acceptable, production=high accuracy required, critical=near-perfect required)
USE CASE TYPE: ${use_case_type}
DATA SENSITIVITY: ${data_sensitivity} (public=safe to send to cloud, internal=prefer local, confidential=must stay local)
LATENCY REQUIREMENT: ${latency_requirement} (flexible=seconds ok, moderate=under 2s preferred, realtime=under 500ms required)

Respond with this exact JSON structure:
{
  "verdict": "LOCAL" | "CLOUD" | "EITHER" | "NEITHER",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "One sentence verdict an agent can act on immediately",
  "reasoning": {
    "quality_assessment": "Can this model reliably handle this task at the required quality level?",
    "cost_impact": "What is the cost argument for local vs cloud here?",
    "privacy_assessment": "What are the data exposure implications of cloud routing?",
    "latency_assessment": "Will local inference meet the latency requirement?",
    "failure_modes": "What specific failures should the agent watch for if using local?"
  },
  "recommended_model": "If verdict is CLOUD, suggest the most cost-effective cloud model for this task",
  "fallback_advice": "If local model fails, what should the agent do?",
  "task_complexity": "SIMPLE" | "MODERATE" | "COMPLEX" | "FRONTIER"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].text.trim();
  return JSON.parse(text);
}

// ─── MCP Protocol ─────────────────────────────────────────────────────────────

const TOOL_DEFINITION = {
  name: 'evaluate_local_model_suitability',
  description:
    'Call this tool before executing any task where you have both a local model (Ollama, LM Studio, etc.) and a cloud API available. ' +
    'Use it to avoid three expensive mistakes: (1) paying cloud rates for tasks a local model handles perfectly, ' +
    '(2) sending sensitive or confidential data to cloud APIs unnecessarily, ' +
    '(3) trusting a local model with tasks beyond its capability and getting silent quality failures. ' +
    'Also use when you need to meet strict latency requirements and must decide whether local inference is fast enough. ' +
    'Returns a structured verdict — LOCAL / CLOUD / EITHER / NEITHER — with specific reasoning about cost, privacy, quality risk, and failure modes for your exact task and model. ' +
    'AI-powered assessment — NOT a simple benchmark lookup. ' +
    'Free tier: first 20 evaluations/month, no API key needed. ' +
    'Full terms: kordagencies.com/terms.html',
  inputSchema: {
    type: 'object',
    properties: {
      task_description: {
        type: 'string',
        description:
          'Describe the task you are about to run. Be specific — include the type of reasoning, expected output format, and any quality constraints. Example: "Classify customer support emails into 5 categories. Must be accurate enough for production routing — wrong classification costs money."',
      },
      local_model: {
        type: 'string',
        description:
          'The local model name and size. Use Ollama-style naming where possible. Examples: llama3.1:8b, mistral:7b, qwen2.5:14b, phi4, deepseek-r1:32b',
      },
      quality_threshold: {
        type: 'string',
        enum: ['draft', 'production', 'critical'],
        description:
          'draft = errors acceptable, output will be reviewed by human. production = high accuracy required, output used directly. critical = near-perfect required, failures have significant consequences.',
      },
      use_case_type: {
        type: 'string',
        enum: [
          'classification',
          'summarisation',
          'code_generation',
          'reasoning',
          'data_extraction',
          'creative_writing',
          'question_answering',
          'translation',
          'sentiment_analysis',
          'other',
        ],
        description: 'The primary type of task the model will perform.',
      },
      data_sensitivity: {
        type: 'string',
        enum: ['public', 'internal', 'confidential'],
        description:
          'public = safe to send to any cloud API. internal = organisation data, prefer local. confidential = must stay on-device, cannot be sent to external APIs.',
      },
      latency_requirement: {
        type: 'string',
        enum: ['flexible', 'moderate', 'realtime'],
        description:
          'flexible = response in seconds is fine. moderate = under 2 seconds preferred. realtime = under 500ms required (e.g. streaming UI, voice agent).',
      },
    },
    required: [
      'task_description',
      'local_model',
      'quality_threshold',
      'use_case_type',
      'data_sensitivity',
      'latency_requirement',
    ],
  },
};

// ─── Request handler ──────────────────────────────────────────────────────────

async function handleRequest(request) {
  const { method, params } = request;

  if (method === 'initialize') {
    return {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'local-model-suitability-mcp', version: VERSION },
    };
  }

  if (method === 'tools/list') {
    return { tools: [TOOL_DEFINITION] };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;

    if (name !== 'evaluate_local_model_suitability') {
      throw { code: -32601, message: `Unknown tool: ${name}` };
    }

    // Stats
    stats.total_requests++;
    stats.tool_usage.evaluate_local_model_suitability =
      (stats.tool_usage.evaluate_local_model_suitability || 0) + 1;
    saveStats(stats);

    // Free tier check
    const apiKey = request._meta?.apiKey || null;
    const clientIp = request._meta?.clientIp || null;
    const tierCheck = checkFreeTier(apiKey, clientIp);

    if (!tierCheck.allowed) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Free tier limit of ${FREE_TIER_LIMIT} evaluations/month reached. You have seen it work — upgrade to Pro ($99/month) at kordagencies.com to continue.`,
              upgrade_url: 'https://kordagencies.com',
              _disclaimer: LEGAL_DISCLAIMER,
            }),
          },
        ],
      };
    }

    // Validate required fields
    const required = [
      'task_description',
      'local_model',
      'quality_threshold',
      'use_case_type',
      'data_sensitivity',
      'latency_requirement',
    ];
    for (const field of required) {
      if (!args[field]) {
        throw {
          code: -32602,
          message: `Missing required parameter: ${field}`,
        };
      }
    }

    // Look up model knowledge
    const modelInfo = lookupModel(args.local_model);

    // Claude brain assessment
    let assessment;
    try {
      assessment = await evaluateWithClaude({
        task_description: args.task_description,
        local_model: args.local_model,
        quality_threshold: args.quality_threshold,
        use_case_type: args.use_case_type,
        data_sensitivity: args.data_sensitivity,
        latency_requirement: args.latency_requirement,
        model_info: modelInfo,
      });
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error:
                'Assessment engine temporarily unavailable — this is not a problem with your query. Please retry in 30 seconds.',
              checked_at: nowISO(),
              _disclaimer: LEGAL_DISCLAIMER,
            }),
          },
        ],
      };
    }

    // Build response
    const response = {
      verdict: assessment.verdict,
      confidence: assessment.confidence,
      summary: assessment.summary,
      model_evaluated: args.local_model,
      model_profile: modelInfo
        ? {
            parameter_count: modelInfo.params,
            tier: modelInfo.tier,
            known_strengths: modelInfo.strengths,
            known_weaknesses: modelInfo.weaknesses,
          }
        : { note: 'Model not in knowledge base — assessment based on name and size patterns' },
      task_complexity: assessment.task_complexity,
      reasoning: assessment.reasoning,
      recommended_cloud_model: assessment.recommended_model || null,
      fallback_advice: assessment.fallback_advice,
      analysis_type: 'AI-powered — NOT a simple benchmark lookup',
      free_tier_remaining: tierCheck.paid ? 'unlimited' : tierCheck.remaining,
      checked_at: nowISO(),
      _disclaimer: LEGAL_DISCLAIMER,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  }

  // Health / stats via special methods
  if (method === 'health') {
    return { status: 'ok', version: VERSION, checked_at: nowISO() };
  }

  throw { code: -32601, message: `Method not found: ${method}` };
}

// ─── HTTP server (for health + stats endpoints) ───────────────────────────────

import { createServer } from 'http';

const httpServer = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', version: VERSION, checked_at: nowISO() }));
    return;
  }

  if (req.url === '/stats') {
    const statsKey = req.headers['x-stats-key'];
    if (statsKey !== process.env.STATS_KEY) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ ...stats, version: VERSION, checked_at: nowISO() }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const HTTP_PORT = process.env.PORT || 3000;
httpServer.listen(HTTP_PORT, () => {
  process.stderr.write(`[local-model-suitability-mcp] HTTP on port ${HTTP_PORT}\n`);
});

// ─── stdio MCP transport ──────────────────────────────────────────────────────

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let request;
    try {
      request = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const id = request.id;
    try {
      const result = await handleRequest(request);
      const response = { jsonrpc: '2.0', id, result };
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (err) {
      const error =
        typeof err === 'object' && err.code
          ? err
          : { code: -32603, message: String(err?.message || err) };
      process.stdout.write(
        JSON.stringify({ jsonrpc: '2.0', id, error }) + '\n'
      );
    }
  }
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
