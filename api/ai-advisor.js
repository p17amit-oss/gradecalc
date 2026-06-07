/**
 * api/ai-advisor.js — Vercel Serverless Function
 * Proxies requests to Anthropic Claude API with SSE streaming.
 * Rate limits: 10 requests per IP per hour (in-memory, resets on cold start).
 * API key is ONLY read server-side from process.env.ANTHROPIC_API_KEY.
 * Never exposes key to client.
 */

// In-memory rate limit store (resets on Vercel cold start — acceptable for this use case)
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 10;       // requests per window
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms

function getRateLimitKey(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown'
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    record.count = 0;
    record.windowStart = now;
  }

  record.count += 1;
  rateLimitStore.set(ip, record);

  return {
    allowed: record.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - record.count),
    resetAt: record.windowStart + RATE_LIMIT_WINDOW,
  };
}

// System prompt — never sent to client
function buildSystemPrompt(inputData) {
  const inputStr = inputData && Object.keys(inputData).length > 0
    ? JSON.stringify(inputData)
    : 'no specific input provided';

  return `You are a grade conversion advisor for international students.
You have access to the user's current calculator input: ${inputStr}.

Your role is to add context that a calculator cannot provide:
- What does this grade actually mean for US/UK graduate admissions?
- Is this competitive for specific programs the user might be targeting?
- What should the student do next (verify with WES, check admit statistics, etc.)?

Known admit statistics to reference when relevant:
- Top 10 US CS MS programs: typically expect GPA equivalent 3.5+
- Mid-tier US MS programs (rank 20–50): typically 3.0–3.5
- Georgia Tech MSCS: median around 3.5, accepts 3.2+ with strong profile
- Carnegie Mellon MSML: highly competitive, 3.7+ typical
- UK universities for international masters: typically 60%+ (2:1) minimum

Rules:
- Answer in 3–5 sentences maximum unless the question genuinely requires more
- Give honest assessments — do not reassure students falsely
- Always note when conversions are approximate
- Stay within academics, grades, admissions context only
- If asked outside this scope, say: "I'm focused on grade conversions and admissions context — try me with a GPA question."
- Reference the user's actual input (${inputStr}) in your answer when relevant — make responses feel specific, not generic
- Never invent statistics or guarantee admission outcomes`;
}

export default async function handler(req, res) {
  const startTime = Date.now();

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — restrict to same origin in production
  const origin = req.headers['origin'] || '';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Rate limit
  const ip = getRateLimitKey(req);
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Rate limit reached. You can ask 10 questions per hour. Please try again later.',
      resetAt: limit.resetAt,
    });
  }

  // Validate API key exists (fail fast)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[ai-advisor] ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'AI advisor temporarily unavailable' });
  }

  // Parse and validate body
  let body;
  try {
    body = req.body;
    if (!body || typeof body !== 'object') throw new Error('Invalid body');
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { messages, pageContext, inputData } = body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  // Sanitize messages — only keep role + content, max 400 tokens of content
  const sanitizedMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({
      role: m.role,
      content: String(m.content || '').slice(0, 1600), // ~400 tokens
    }))
    .slice(-10); // keep last 10 messages to stay within token budget

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages provided' });
  }

  // Last message must be user
  if (sanitizedMessages[sanitizedMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Last message must be from user' });
  }

  // Set up SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 350,
        system: buildSystemPrompt(inputData || {}),
        messages: sanitizedMessages,
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[ai-advisor] Anthropic API error:', anthropicRes.status, errText);
      res.write(`data: ${JSON.stringify({ error: 'AI advisor temporarily unavailable' })}\n\n`);
      return res.end();
    }

    // Stream response back to client
    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            break;
          }
          try {
            const parsed = JSON.parse(data);
            // Extract text delta from Anthropic streaming format
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
            // Handle message_stop
            if (parsed.type === 'message_stop') {
              res.write('data: [DONE]\n\n');
            }
          } catch { /* partial JSON chunk — skip */ }
        }
      }
    }

    // Log metadata only — no content
    console.log(`[ai-advisor] response_time=${Date.now() - startTime}ms page=${String(pageContext || '').slice(0, 100)}`);

  } catch (err) {
    console.error('[ai-advisor] Streaming error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI advisor temporarily unavailable' })}\n\n`);
  }

  res.end();
}
