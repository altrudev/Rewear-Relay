import { Hono } from 'hono';
import { PerfectCorpProvider } from '@rewear/providers';
import { imageTicketSchema, taskIdSchema, tryOnSchema } from '@rewear/validation';

type Bindings = {
  PERFECT_API_KEY: string;
  PERFECT_API_BASE?: string;
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

app.get('/api/health', (c) => c.json({ ok: true, service: 'rewear-relay-edge' }));

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

app.onError((error, c) => {
  console.error('request_failed', { name: error.name, message: error.message });
  const safeMessage = error.message.startsWith('PERFECT_') ? error.message : 'REQUEST_FAILED';
  return c.json({ error: safeMessage }, 500);
});

export default app;
