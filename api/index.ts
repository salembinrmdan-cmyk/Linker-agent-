import { createServerApp } from '../linker-agent11/server/app';

let app: ReturnType<typeof createServerApp> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  if (!app) app = createServerApp();
  app(req, res, (err: unknown) => {
    if (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, message: 'Not found' }));
    }
  });
}
