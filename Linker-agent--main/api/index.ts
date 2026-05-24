import { createServerApp } from '../linker-agent11/server/app';

let app: ReturnType<typeof createServerApp> | null = null;
let initError: Error | null = null;
let requestCount = 0;

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
  console.log(`[${requestId}] ${req.method} ${req.url}`);

  try {
    const expressApp = getApp();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressApp(req, res, (error: any) => {
      if (res.headersSent) return;
      if (error) {
        console.error(`[${requestId}] Express error:`, error?.message || error);
        res.statusCode = error?.status || 500;
        res.end(JSON.stringify({ ok: false, message: 'Internal server error', requestId }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, message: `Not found: ${req.url}`, requestId }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] FATAL:`, message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, message: 'Service unavailable', requestId }));
    }
  }
}
