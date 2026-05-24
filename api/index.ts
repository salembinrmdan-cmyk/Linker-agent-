import { createServerApp } from '../linker-agent11/server/app';

let app: ReturnType<typeof createServerApp> | null = null;
let initError: Error | null = null;
let requestCount = 0;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  const requestId = `r${++requestCount}_${Date.now()}`;
  const url = req.url || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.includes('/survey/config')) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(cachedSurveyConfig));
    return;
  }

  if (req.method === 'POST' && url.includes('/survey/config') && !url.includes('/reset')) {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
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
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true, config: cachedSurveyConfig }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: false, message: `Save failed: ${err instanceof Error ? err.message : String(err)}` }));
    }
    return;
  }

  if (req.method === 'POST' && url.includes('/survey/config/reset')) {
    cachedSurveyConfig = { humanMode: false, questions: [] };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true, config: cachedSurveyConfig }));
    return;
  }

  console.log(`[${requestId}] ${req.method} ${req.url}`);

  try {
    const expressApp = getApp();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressApp(req, res, (error: any) => {
      if (res.headersSent) return;
      if (error) {
        console.error(`[${requestId}] Express error:`, error?.message || error);
        res.statusCode = error?.status || 500;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ ok: false, message: error?.message || 'Internal server error', requestId }));
        return;
      }
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ ok: false, message: `Not found: ${req.url}`, requestId }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] FATAL:`, message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ ok: false, message: 'Service unavailable', requestId }));
    }
  }
}
