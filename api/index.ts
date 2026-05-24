import { createServerApp } from '../linker-agent11/server/app';

let app: ReturnType<typeof createServerApp> | null = null;
let initError: Error | null = null;
let requestCount = 0;

// In-memory survey config mirror (survives hot lambda)
let cachedSurveyConfig: { humanMode: boolean; questions: any[] } = {
  humanMode: false,
  questions: [],
};

function getApp() {
  if (initError) throw initError;
  if (!app) {
    try {
      app = createServerApp();
    } catch (error) {
      initError = error instanceof Error ? error : new Error(String(error));
      console.error('[FATAL] App init failed:', initError.message);
      throw initError;
    }
  }
  return app;
}

function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

async function readBody(req: any): Promise<any> {
  if (typeof req.body === 'string') return req.body.trim() ? JSON.parse(req.body) : {};
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
  return raw.trim() ? JSON.parse(raw) : {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const requestId = `r${++requestCount}_${Date.now()}`;

  // Handle survey config inline (no Express dependency needed)
  const url = req.url || '/';
  if (req.method === 'GET' && url.includes('/survey/config')) {
    sendJson(res, 200, cachedSurveyConfig);
    return;
  }
  if (req.method === 'POST' && url.includes('/survey/config') && !url.includes('/reset')) {
    try {
      const body = await readBody(req);
      if (body.humanMode !== undefined) cachedSurveyConfig.humanMode = Boolean(body.humanMode);
      if (Array.isArray(body.questions)) {
        cachedSurveyConfig.questions = body.questions
          .filter((q: any) => typeof q?.id === 'string' && typeof q?.text === 'string')
          .map((q: any) => ({
            ...q,
            type: q.type || 'open_text',
            options: Array.isArray(q.options) ? q.options : [],
          }));
      }
      sendJson(res, 200, { ok: true, config: cachedSurveyConfig });
    } catch (err) {
      sendJson(res, 500, { ok: false, message: `Save failed: ${err instanceof Error ? err.message : String(err)}` });
    }
    return;
  }
  if (req.method === 'POST' && url.includes('/survey/config/reset')) {
    cachedSurveyConfig = { humanMode: false, questions: [] };
    sendJson(res, 200, { ok: true, config: cachedSurveyConfig });
    return;
  }

  // Fall through to Express for all other routes
  console.log(`[${requestId}] ${req.method} ${req.url}`);
  try {
    const expressApp = getApp();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressApp(req, res, (error: any) => {
      if (res.headersSent) return;
      if (error) {
        console.error(`[${requestId}] Express error:`, error?.message || error);
        sendJson(res, error?.status || 500, { ok: false, message: error?.message || 'Internal server error', requestId });
        return;
      }
      sendJson(res, 404, { ok: false, message: `Not found: ${req.url}`, requestId });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] FATAL:`, message);
    sendJson(res, 500, { ok: false, message: 'Service unavailable', requestId });
  }
}
