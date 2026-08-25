import { Hono } from 'hono';
import { PerfectCorpProvider } from '@rewear/providers';
import {
  imageTicketSchema,
  relayPlanSchema,
  relayRequestSchema,
  taskIdSchema,
  tryOnSchema
} from '@rewear/validation';

type Bindings = {
  PERFECT_API_KEY: string;
  PERFECT_API_BASE?: string;
  RELAY_RIG_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(self)');
  c.header('Cache-Control', 'no-store');
  await next();
});

function perfect(c: any) {
  if (!c.env.PERFECT_API_KEY) throw new Error('PERFECT_API_KEY_MISSING');
  return new PerfectCorpProvider(c.env.PERFECT_API_KEY, c.env.PERFECT_API_BASE);
}

function rigBaseUrl(c: any) {
  const raw = c.env.RELAY_RIG_URL;
  if (!raw) throw new Error('RIG_RUNTIME_MISSING');

  const url = new URL(raw);
  const localDev = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(localDev && url.protocol === 'http:')) {
    throw new Error('RIG_RUNTIME_INVALID');
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

app.get('/api/health', (c) => c.json({
  ok: true,
  service: 'rewear-relay-edge',
  rigConfigured: Boolean(c.env.RELAY_RIG_URL)
}));

app.post('/api/assets/upload-ticket', async (c) => {
  const input = imageTicketSchema.parse(await c.req.json());
  const ticket = await perfect(c).createUploadTicket(input);
  return c.json(ticket);
});

app.post('/api/tryon', async (c) => {
  const input = tryOnSchema.parse(await c.req.json());
  const task = await perfect(c).createTryOn(input);
  return c.json(task, 202);
});

app.get('/api/tryon/:taskId', async (c) => {
  const taskId = taskIdSchema.parse(c.req.param('taskId'));
  return c.json(await perfect(c).getTryOn(taskId));
});

app.delete('/api/tryon/:taskId', async (c) => {
  const taskId = taskIdSchema.parse(c.req.param('taskId'));
  await perfect(c).deleteTask(taskId);
  return c.json({ deleted: true });
});

app.post('/api/relay/rank', async (c) => {
  const request = relayRequestSchema.parse(await c.req.json());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${rigBaseUrl(c)}/v1/relay/rank`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    if (!response.ok) {
      console.error('rig_request_failed', { status: response.status });
      throw new Error('RIG_RUNTIME_UNAVAILABLE');
    }

    const plan = relayPlanSchema.parse(await response.json());
    const allowed = new Set(request.candidates.map((candidate) => candidate.id));

    if (plan.source_item_id !== request.source.id) {
      throw new Error('RIG_PLAN_REJECTED');
    }

    const seen = new Set<string>();
    for (const ranked of plan.ranked) {
      if (!allowed.has(ranked.candidate_id) || seen.has(ranked.candidate_id)) {
        throw new Error('RIG_PLAN_REJECTED');
      }
      seen.add(ranked.candidate_id);
    }

    return c.json(plan);
  } finally {
    clearTimeout(timer);
  }
});

app.onError((error, c) => {
  console.error('request_failed', { name: error.name, message: error.message });
  const safeCodes = new Set([
    'PERFECT_API_KEY_MISSING',
    'RIG_RUNTIME_MISSING',
    'RIG_RUNTIME_INVALID',
    'RIG_RUNTIME_UNAVAILABLE',
    'RIG_PLAN_REJECTED'
  ]);
  const safeMessage = error.message.startsWith('PERFECT_') || safeCodes.has(error.message)
    ? error.message
    : 'REQUEST_FAILED';
  const status = safeMessage === 'RIG_RUNTIME_UNAVAILABLE' ? 503 : 500;
  return c.json({ error: safeMessage }, status);
});

export default app;
