/**
 * Utilitário robusto de sanitização para mascarar PII (dados pessoais) e chaves sensíveis,
 * tokens, certificados, senhas e chaves de API nos logs do sistema.
 */

const SENSITIVE_KEYS = new Set([
  'client_secret',
  'clientsecret',
  'secret',
  'efi_client_secret',
  'efi_certificate',
  'certificate',
  'private_key',
  'privatekey',
  'password',
  'senha',
  'api_key',
  'apikey',
  'base44_api_key',
  'base44_webhook_secret',
  'reobote_api_key',
  'authorization',
  'token',
  'access_token',
  'x-api-key',
  'x-webhook-signature',
  'creditcard',
  'cardnumber',
  'cvv',
]);

export function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact Bearer / Basic auth
    if (/^Bearer\s+/i.test(data) || /^Basic\s+/i.test(data)) {
      return '[REDACTED_AUTH_TOKEN]';
    }
    // Redact certificates
    if (data.includes('BEGIN CERTIFICATE') || data.includes('BEGIN PRIVATE KEY')) {
      return '[REDACTED_CERTIFICATE]';
    }
    // Long base64 strings
    if (data.length > 200 && /^[A-Za-z0-9+/=]+$/.test(data.trim())) {
      return `[REDACTED_BASE64_DATA: length ${data.length}]`;
    }
    // Mask potential CPF (XXX.XXX.XXX-XX or XXXXXXXXXXX)
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data) || /^\d{11}$/.test(data)) {
      return '***.***.***-**';
    }
    // Mask potential email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      const [user, domain] = data.split('@');
      const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : '***';
      return `${maskedUser}@${domain}`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        SENSITIVE_KEYS.has(lowerKey) ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('cert') ||
        lowerKey.includes('token') ||
        lowerKey.includes('key')
      ) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeData(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}
