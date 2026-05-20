/**
 * Vercel Serverless API Handler
 * IMPORTANT: This file imports from server/app.ts ONLY (NOT server/index.ts)
 * server/index.ts contains app.listen() which crashes in Serverless environments
 */
import 'dotenv/config';
import { createServerApp } from '../linker-agent11/server/app';

// Singleton — created once per cold start
let app: ReturnType<typeof createServerApp> | null = null;
let initError: Error | null = null;
let reqCount = 0;

function getApp() {
  if (initError) throw initError;
  if (!app) {
    try {
      console.log('[INIT] Creating Express app...');
      app = createServerApp();
      console.log('[INIT] Express app ready');
    } catch (err) {
      initError = err instanceof Error ? err : new Error(String(err));
      console.error('[FATAL] App initialization failed:', initError.message);
      throw initError;
    }
  }
  return app;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  const id = `r${++reqCount}_${Date.now()}`;
  console.log(`[${id}] ${req.method} ${req.url}`);

  // Ensure response is always JSON
  res.setHeader('Content-Type', 'application/json');

  try {
    const expressApp = getApp();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressApp(req, res, (err: any) => {
      if (res.headersSent) return;
      if (err) {
        console.error(`[${id}] Express error:`, err?.message || err);
        res.statusCode = err?.status || 500;
        res.end(JSON.stringify({
          ok: false,
          message: err?.message || 'Internal server error',
          requestId: id,
        }));
      } else {
        console.log(`[${id}] 404: ${req.url}`);
        res.statusCode = 404;
        res.end(JSON.stringify({
          ok: false,
          message: `Endpoint not found: ${req.url}`,
          requestId: id,
        }));
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${id}] FATAL:`, msg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({
        ok: false,
        message: `Service unavailable: ${msg}`,
        requestId: id,
      }));
    }
  }
}
