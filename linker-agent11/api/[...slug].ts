import type { Request, Response, NextFunction } from 'express';

let app: ((req: Request, res: Response, next: NextFunction) => void) | null = null;

async function getApp() {
  if (!app) {
    const { createServerApp } = await import('../server/app');
    app = createServerApp();
  }
  return app;
}

export default async function handler(req: Request, res: Response) {
  try {
    const expressApp = await getApp();
    expressApp(req, res, () => {
      res.status(404).json({ ok: false, message: 'Route not found' });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: 'HANDLER_ERROR', message });
  }
}
