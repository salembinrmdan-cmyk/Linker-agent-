import { createServerApp } from '../linker-agent11/server/app';

let app: ReturnType<typeof createServerApp> | null = null;

export default function handler(req: unknown, res: unknown) {
  if (!app) app = createServerApp();
  return app(req, res);
}
