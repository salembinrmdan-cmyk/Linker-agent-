/**
 * Self-contained Vercel handler — zero external dependencies
 * Tests WhatsApp provider connection without Express or Prisma
 */

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function parseWhapiError(status: number, body: string): string {
  try {
    const p = JSON.parse(body) as Record<string, unknown>;
    const err = p?.error;
    const msg = typeof err === 'object' && err !== null
      ? (err as Record<string, unknown>).message
      : (p?.message ?? err);
    if (msg) return String(msg);
  } catch { /**/ }
  if (status === 401) return 'Token غير صالح أو منتهي الصلاحية';
  if (status === 403) return 'الوصول مرفوض — تأكد من صحة الـ Token';
  if (status === 404) return 'القناة غير موجودة لهذا الـ Token';
  if (status === 429) return 'تجاوزت حد الطلبات — انتظر قليلاً';
  if (status >= 500) return 'خطأ في خادم whapi.cloud';
  return `رمز الحالة: ${status}`;
}

async function testWhapi(apiUrl: string, apiKey: string) {
  for (const mode of ['bearer', 'query'] as const) {
    const url = mode === 'query'
      ? `${apiUrl}/health?wakeup=false&token=${encodeURIComponent(apiKey)}`
      : `${apiUrl}/health?wakeup=false`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (mode === 'bearer') headers.Authorization = `Bearer ${apiKey}`;
    try {
      const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      if (res.ok) {
        let status = 'متصل';
        try { status = (JSON.parse(text) as Record<string,unknown>)?.status as string || 'متصل'; } catch {/**/ }
        return { ok: true as const, message: `✅ تم الاتصال بنجاح — حالة القناة: ${status}` };
      }
      const errMsg = parseWhapiError(res.status, text);
      if (res.status !== 401 && res.status !== 403) return { ok: false as const, message: errMsg };
    } catch (err) {
      const msg = err instanceof Error && err.name === 'TimeoutError'
        ? 'انتهت مهلة الاتصال (10 ثانية)'
        : `خطأ في الشبكة: ${err instanceof Error ? err.message : String(err)}`;
      return { ok: false as const, message: msg };
    }
  }
  return { ok: false as const, message: 'فشل الاتصال — Token غير صالح' };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  // Health check
  if (req.method === 'GET' || req.url?.includes('/health')) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, service: 'Linker Agent API', timestamp: new Date().toISOString() }));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }));
    return;
  }

  try {
    // Parse body (Vercel may or may not pre-parse)
    let body: Record<string, unknown> = {};
    if (req.body && typeof req.body === 'object') {
      body = req.body as Record<string, unknown>;
    } else {
      const raw: string = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      if (raw) body = JSON.parse(raw) as Record<string, unknown>;
    }

    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const apiUrl = typeof body.apiUrl === 'string' ? body.apiUrl.trim() : 'https://gate.whapi.cloud/';

    if (!apiKey) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, message: 'API Key مطلوب' }));
      return;
    }

    const result = await testWhapi(normalizeUrl(apiUrl), apiKey);
    res.statusCode = result.ok ? 200 : 502;
    res.end(JSON.stringify(result));

  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, message: `خطأ: ${err instanceof Error ? err.message : String(err)}` }));
  }
}
