import { createServerApp } from '../linker-agent11/server/app';
import type { IncomingMessage, ServerResponse } from 'node:http';

let app: ReturnType<typeof createServerApp> | null = null;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (!app) app = createServerApp();
  return app(req, res);
}
