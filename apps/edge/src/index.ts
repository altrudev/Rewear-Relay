import { Hono } from 'hono';
import { FixtureSearchProvider, PerfectCorpProvider, SerpApiSearchProvider } from '@rewear/providers';
import {
  candidateSetPayloadSchema,
  candidateTaskActionSchema,
  candidateTryOnSchema,
  imageTicketSchema,
  inventorySearchSchema,
  relayPlanSchema,
  relayRankInputSchema,
  relayRequestSchema,
  taskIdSchema,
  tryOnSchema,
  vtoBindingPayloadSchema
} from '@rewear/validation';
import {
  signCandidateSet,
  signVtoBinding,
  verifyCandidateSet,
  verifyVtoBinding
} from './candidateSet';

type Bindings = {
  PERFECT_API_KEY: string;
  PERFECT_API_BASE?: string;
  RELAY_RIG_URL?: string;
  SERPAPI_KEY?: string;
  SEARCH_PROVIDER?: string;
  SEARCH_SIGNING_KEY?: string;
  SEARCH_RECEIPT_TTL_SECONDS?: string;
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

function searchProvider(c: any) {
  const provider = c.env.SEARCH_PROVIDER || 'fixture';
  if (provider === 'fixture') return new FixtureSearchProvider();
  if (provider === 'serpapi') {
    if (!c.env.SERPAPI_KEY) throw new Error('SERPAPI_KEY_MISSING');
    return new SerpApiSearchProvider(c.env.SERPAPI_KEY);
  }
  throw new Error('SEARCH_PROVIDER_INVALID');
}

function searchSigningKey(c: any): string {
  const secret = c.env.SEARCH_SIGNING_KEY;
  if (!secret) throw new Error('SEARCH_SIGNING_KEY_MISSING');
  if (secret.length < 32) throw new Error('SEARCH_SIGNING_KEY_WEAK');
  return secret;
}

function searchReceiptTtl(c: any): number {
  const parsed = Number(c.env.SEARCH_RECEIPT_TTL_SECONDS ?? '900');
  if (!Number.isFinite(parsed)) return 900;
  return Math.max(60, Math.min(Math.floor(parsed), 3600));
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

function publicHttpsReference(raw: string | undefined): string {
  if (!raw) throw new Error('CANDIDATE_IMAGE_MISSING');
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new Error('CANDIDATE_IMAGE_UNSAFE'); }
  if (url.protocol !== 'https:') throw new Error('CANDIDATE_IMAGE_UNSAFE');

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.includes(':')) {
    throw new Error('CANDIDATE_IMAGE_UNSAFE');
  }

  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (match) {
    const [a,b,c,d] = match.slice(1).map(Number);
    if ([a,b,c,d].some((part) => part < 0 || part > 255)) throw new Error('CANDIDATE_IMAGE_UNSAFE');
    if (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    ) throw new Error('CANDIDATE_IMAGE_UNSAFE');
  }

  url.username = '';
  url.password = '';
  return url.toString();
}

async function verifiedCandidateSet(c: any, token: string) {
  const decoded = await verifyCandidateSet(searchSigningKey(c), token);
  const candidateSet = candidateSetPayloadSchema.parse(decoded);
  if (Date.parse(candidateSet.expiresAt) <= Date.now()) throw new Error('CANDIDATE_SET_EXPIRED');
  return candidateSet;
}

async function verifiedVtoBinding(c: any, taskId: string, token: string, allowExpired = false) {
  const decoded = await verifyVtoBinding(searchSigningKey(c), token);
  const binding = vtoBindingPayloadSchema.parse(decoded);
  if (binding.taskId !== taskId) throw new Error('VTO_BINDING_MISMATCH');
  if (!allowExpired && Date.parse(binding.expiresAt) <= Date.now()) throw new Error('VTO_BINDING_EXPIRED');
  return binding;
}

app.get('/api/health', (c) => c.json({
  ok: true,
  service: 'rewear-relay-edge',
  rigConfigured: Boolean(c.env.RELAY_RIG_URL),
  searchProvider: c.env.SEARCH_PROVIDER || 'fixture',
  searchReceiptsConfigured: Boolean(c.env.SEARCH_SIGNING_KEY)
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

app.post('/api/search', async (c) => {
  const input = inventorySearchSchema.parse(await c.req.json());
  let result;
  try {
    result = await searchProvider(c).search({
      query: input.query,
      maxResults: input.maxResults,
      strictSecondhand: input.strictSecondhand,
      region: input.region
    });
  } catch (cause) {
    console.error('search_provider_failed', {
      name: cause instanceof Error ? cause.name : 'Error',
      message: cause instanceof Error ? cause.message : 'unknown'
    });
    if (cause instanceof Error && ['SERPAPI_KEY_MISSING', 'SEARCH_PROVIDER_INVALID'].includes(cause.message)) throw cause;
    throw new Error('SEARCH_PROVIDER_UNAVAILABLE');
  }

  const expiresAt = new Date(Date.parse(result.receivedAt) + searchReceiptTtl(c) * 1000).toISOString();
  if (result.candidates.length === 0) {
    return c.json({
      provider: result.provider,
      query: result.query,
      providerQuery: result.providerQuery,
      observedAt: result.observedAt,
      receivedAt: result.receivedAt,
      expiresAt,
      candidates: [],
      candidateSetToken: null
    });
  }

  const payload = candidateSetPayloadSchema.parse({
    version: 1,
    provider: result.provider,
    query: result.query,
    providerQuery: result.providerQuery,
    observedAt: result.observedAt,
    receivedAt: result.receivedAt,
    expiresAt,
    source: input.source,
    inventory: result.candidates
  });
  const candidateSetToken = await signCandidateSet(searchSigningKey(c), payload);

  return c.json({
    provider: result.provider,
    query: result.query,
    providerQuery: result.providerQuery,
    observedAt: result.observedAt,
    receivedAt: result.receivedAt,
    expiresAt,
    candidates: result.candidates,
    candidateSetToken
  });
});

app.post('/api/relay/rank', async (c) => {
  const input = relayRankInputSchema.parse(await c.req.json());
  const candidateSet = await verifiedCandidateSet(c, input.candidateSetToken);

  const request = relayRequestSchema.parse({
    source: candidateSet.source,
    candidates: candidateSet.inventory.map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      price: candidate.price,
      currency: candidate.currency,
      source: candidate.source,
      observed_at: candidate.observedAt,
      garment_category: candidate.garmentCategory
    })),
    intent: input.intent
  });

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
    if (plan.source_item_id !== request.source.id) throw new Error('RIG_PLAN_REJECTED');

    const seen = new Set<string>();
    for (const ranked of plan.ranked) {
      if (!allowed.has(ranked.candidate_id) || seen.has(ranked.candidate_id)) throw new Error('RIG_PLAN_REJECTED');
      seen.add(ranked.candidate_id);
    }

    return c.json({
      ...plan,
      candidateSet: {
        provider: candidateSet.provider,
        observedAt: candidateSet.observedAt,
        receivedAt: candidateSet.receivedAt,
        expiresAt: candidateSet.expiresAt
      }
    });
  } finally {
    clearTimeout(timer);
  }
});

app.post('/api/tryon/candidate', async (c) => {
  const input = candidateTryOnSchema.parse(await c.req.json());
  const candidateSet = await verifiedCandidateSet(c, input.candidateSetToken);
  const candidate = candidateSet.inventory.find((item) => item.id === input.candidateId);
  if (!candidate) throw new Error('CANDIDATE_NOT_IN_SET');

  const garmentImageUrl = publicHttpsReference(candidate.imageUrl);
  const task = await perfect(c).createTryOn({
    personFileId: input.personFileId,
    garmentFileUrl: garmentImageUrl,
    garmentCategory: input.garmentCategory ?? candidate.garmentCategory ?? 'auto'
  });

  const createdAt = new Date().toISOString();
  const binding = vtoBindingPayloadSchema.parse({
    version: 1,
    taskId: task.taskId,
    candidateId: candidate.id,
    sourceItemId: candidateSet.source.id,
    personFileId: input.personFileId,
    garmentImageUrl,
    candidateSetObservedAt: candidateSet.observedAt,
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + 30 * 60 * 1000).toISOString()
  });
  const bindingToken = await signVtoBinding(searchSigningKey(c), binding);

  return c.json({
    taskId: task.taskId,
    bindingToken,
    candidate: {id: candidate.id, title: candidate.title, source: candidate.source, imageUrl: garmentImageUrl},
    candidateSet: {observedAt: candidateSet.observedAt, receivedAt: candidateSet.receivedAt}
  }, 202);
});

app.post('/api/tryon/candidate/status', async (c) => {
  const input = candidateTaskActionSchema.parse(await c.req.json());
  const binding = await verifiedVtoBinding(c, input.taskId, input.bindingToken);
  const status = await perfect(c).getTryOn(input.taskId);
  return c.json({...status, binding: {candidateId: binding.candidateId, sourceItemId: binding.sourceItemId}});
});

app.post('/api/tryon/candidate/delete', async (c) => {
  const input = candidateTaskActionSchema.parse(await c.req.json());
  const binding = await verifiedVtoBinding(c, input.taskId, input.bindingToken, true);
  await perfect(c).deleteTask(input.taskId);
  return c.json({deleted: true, candidateId: binding.candidateId});
});

app.onError((error, c) => {
  console.error('request_failed', { name: error.name, message: error.message });
  const safeCodes = new Set([
    'PERFECT_API_KEY_MISSING',
    'PERFECT_REFERENCE_INVALID',
    'RIG_RUNTIME_MISSING',
    'RIG_RUNTIME_INVALID',
    'RIG_RUNTIME_UNAVAILABLE',
    'RIG_PLAN_REJECTED',
    'SERPAPI_KEY_MISSING',
    'SEARCH_PROVIDER_INVALID',
    'SEARCH_PROVIDER_UNAVAILABLE',
    'SEARCH_SIGNING_KEY_MISSING',
    'SEARCH_SIGNING_KEY_WEAK',
    'CANDIDATE_SET_TOKEN_INVALID',
    'CANDIDATE_SET_EXPIRED',
    'CANDIDATE_NOT_IN_SET',
    'CANDIDATE_IMAGE_MISSING',
    'CANDIDATE_IMAGE_UNSAFE',
    'VTO_BINDING_TOKEN_INVALID',
    'VTO_BINDING_MISMATCH',
    'VTO_BINDING_EXPIRED'
  ]);
  const safeMessage = error.message.startsWith('PERFECT_') || safeCodes.has(error.message)
    ? error.message
    : 'REQUEST_FAILED';
  const status = ['RIG_RUNTIME_UNAVAILABLE', 'SEARCH_PROVIDER_UNAVAILABLE'].includes(safeMessage)
    ? 503
    : [
        'CANDIDATE_SET_TOKEN_INVALID', 'CANDIDATE_SET_EXPIRED', 'CANDIDATE_NOT_IN_SET',
        'CANDIDATE_IMAGE_MISSING', 'CANDIDATE_IMAGE_UNSAFE', 'VTO_BINDING_TOKEN_INVALID',
        'VTO_BINDING_MISMATCH', 'VTO_BINDING_EXPIRED'
      ].includes(safeMessage)
      ? 400
      : 500;
  return c.json({ error: safeMessage }, status);
});

export default app;
