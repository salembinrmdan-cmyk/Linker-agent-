import { createServerApp } from '../server/app';

let app: ReturnType<typeof createServerApp> | null = null;

export default function handler(req: unknown, res: unknown) {
  if (!app) app = createServerApp();
  return app(req, res);
}
