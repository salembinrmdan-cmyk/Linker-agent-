import { createServerApp } from '../server/app';
import type { Request, Response } from 'express';

const app = createServerApp();

export default function handler(req: Request, res: Response) {
  app(req, res, () => {
    res.status(404).json({ ok: false, message: 'Route not found' });
  });
}
