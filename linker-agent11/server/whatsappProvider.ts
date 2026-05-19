function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function resolveWhatsAppProviderConfig(payload: Record<string, unknown>) {
  const apiUrlFromBody = stringField(payload.apiUrl);
  const apiKeyFromBody = stringField(payload.apiKey);
  const envUrl = stringField(process.env.WHATSAPP_API_URL);
  const envToken = stringField(process.env.WHATSAPP_API_TOKEN);

  return {
    apiUrl: normalizeBaseUrl(apiUrlFromBody || envUrl || 'https://gate.whapi.cloud/'),
    apiKey: apiKeyFromBody || envToken,
  };
}

export async function testWhapiConnection(apiUrl: string, apiKey: string) {
  const candidatePaths = ['/health', '/settings'];
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  let lastStatus: number | null = null;
  let lastError = '';
  for (const path of candidatePaths) {
    try {
      const result = await fetch(`${apiUrl}${path}`, { method: 'GET', headers });
      if (result.ok) {
        return { ok: true as const, path, status: result.status };
      }
      lastStatus = result.status;
      lastError = `Provider responded with status ${result.status} on ${path}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Connection failed';
    }
  }

  return { ok: false as const, status: lastStatus, message: lastError || 'Connection failed' };
}
