import { createServerApp } from '../server/app';

let app: ReturnType<typeof createServerApp> | null = null;
let initError: Error | null = null;
let reqCount = 0;

function getApp() {
  if (initError) throw initError;
  if (!app) {
    try {
      app = createServerApp();
    } catch (err) {
      initError = err instanceof Error ? err : new Error(String(err));
      console.error('[FATAL] App init failed:', initError.message);
      throw initError;
    }
  }
  return app;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  const id = `r${++reqCount}_${Date.now()}`;
  console.log(`[${id}] ${req.method} ${req.url}`);
  res.setHeader('Content-Type', 'application/json');

  try {
    const expressApp = getApp();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressApp(req, res, (err: any) => {
      if (res.headersSent) return;
      if (err) {
        console.error(`[${id}] Express error:`, err?.message || err);
        res.statusCode = err?.status || 500;
        res.end(JSON.stringify({ ok: false, message: err?.message || 'Internal server error', requestId: id }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, message: `Not found: ${req.url}`, requestId: id }));
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${id}] FATAL:`, msg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, message: `Service unavailable: ${msg}`, requestId: id }));
    }
  }
}
