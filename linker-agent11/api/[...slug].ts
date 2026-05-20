import { createServerApp } from '../server/app';

let app: ReturnType<typeof createServerApp> | null = null;

export default function handler(req: unknown, res: unknown) {
  if (!app) app = createServerApp();
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
