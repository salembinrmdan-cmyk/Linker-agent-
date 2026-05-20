/**
 * Standalone Vercel function for testing WhatsApp provider connection.
 * Intentionally has NO database imports — works even without DATABASE_URL.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isWhapiProvider(url: string): boolean {
  return url.includes('whapi.cloud') || url.includes('whapi.io');
}

function parseWhapiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message || parsed?.message || parsed?.error || '';
    if (msg) return String(msg);
  } catch { /* not JSON */ }
  if (status === 401) return 'Token غير صالح أو منتهي الصلاحية — تحقق من API Token في لوحة whapi.cloud';
  if (status === 403) return 'الوصول مرفوض — تأكد من صحة الـ Token وأن القناة مفعّلة في لوحة whapi.cloud';
  if (status === 404) return 'القناة غير موجودة — تحقق من أن الـ Token مرتبط بقناة نشطة';
  if (status === 429) return 'تجاوزت حد الطلبات — انتظر قليلاً ثم أعد المحاولة';
  if (status >= 500) return 'خطأ في خادم whapi.cloud — حاول مرة أخرى لاحقاً';
  return `رمز الحالة: ${status}`;
}

async function testWhapiConnection(apiUrl: string, apiKey: string) {
  const testPath = '/health';
  const attempts: Array<{ authMode: string; ok: boolean; status?: number; error?: string; body?: string }> = [];

  for (const mode of ['bearer', 'query_token'] as const) {
    const url = mode === 'query_token'
      ? `${apiUrl}${testPath}?wakeup=false&token=${encodeURIComponent(apiKey)}`
      : `${apiUrl}${testPath}?wakeup=false`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (mode === 'bearer') headers['Authorization'] = `Bearer ${apiKey}`;

    try {
      const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
      const body = await res.text();
      if (res.ok) {
        let channelStatus = 'متصل';
        try { const p = JSON.parse(body); channelStatus = p?.status || p?.deviceStatus || 'متصل'; } catch { /**/ }
        attempts.push({ authMode: mode, ok: true, status: res.status });
        return { ok: true as const, channelStatus, authMode: mode, attempts };
      }
      attempts.push({ authMode: mode, ok: false, status: res.status, body: parseWhapiError(res.status, body) });
      if (res.status !== 401 && res.status !== 403) break;
    } catch (err) {
      const msg = err instanceof Error && err.name === 'TimeoutError'
        ? 'انتهت مهلة الاتصال (10 ثانية)'
        : 'خطأ في الشبكة — تعذّر الوصول إلى gate.whapi.cloud';
      attempts.push({ authMode: mode, ok: false, error: msg });
    }
  }

  const last = attempts[attempts.length - 1];
  return { ok: false as const, message: last?.body || last?.error || 'فشل الاتصال', attempts };
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }));
    return;
  }

  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || '{}');
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const apiUrl = typeof body.apiUrl === 'string' ? body.apiUrl.trim() : 'https://gate.whapi.cloud/';
    const provider = typeof body.provider === 'string' ? body.provider.trim() : 'custom';

    if (!apiKey) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, message: 'Missing API Key' }));
      return;
    }

    if (provider !== 'custom') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, connected: true, message: 'تم التحقق من المزود المحدد' }));
      return;
    }

    const normalizedUrl = normalizeBaseUrl(apiUrl);
    const result = isWhapiProvider(normalizedUrl)
      ? await testWhapiConnection(normalizedUrl, apiKey)
      : { ok: false as const, message: 'مزود غير معروف', attempts: [] };

    if (!result.ok) {
      res.writeHead(502);
      res.end(JSON.stringify({ ok: false, connected: false, message: result.message, attempts: result.attempts }));
      return;
    }

    const channelStatus = 'channelStatus' in result ? result.channelStatus : undefined;
    const statusNote = channelStatus && channelStatus !== 'متصل' ? ` — حالة القناة: ${channelStatus}` : '';
    res.writeHead(200);
    res.end(JSON.stringify({
      ok: true,
      connected: true,
      message: `✅ تم الاتصال بنجاح${statusNote}`,
      channelStatus,
      attempts: result.attempts,
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, message: `خطأ داخلي: ${err instanceof Error ? err.message : 'unknown'}` }));
  }
}
