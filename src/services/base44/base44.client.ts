import crypto from 'crypto';
import { config } from '../../config/env.ts';
import { logger } from '../../utils/logger.ts';

export class Base44Client {
  public isConfigured(): boolean {
    return Boolean(config.base44.apiUrl);
  }

  /**
   * Envia uma requisição HTTP autenticada para o backend do Base44 REOBOTE.
   */
  async post<T>(endpointPath: string, payload: unknown): Promise<{ status: number; data: T }> {
    if (!this.isConfigured()) {
      logger.warn('Base44Client: BASE44_API_URL não configurada no .env. Notificação registrada localmente nos logs.', {
        endpoint: endpointPath,
        payload,
      });
      return {
        status: 200,
        data: { simulado: true, aviso: 'BASE44_API_URL não configurada.' } as unknown as T,
      };
    }

    // Normaliza URL base e path
    const baseUrl = config.base44.apiUrl.replace(/\/+$/, '');
    const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    const fullUrl = `${baseUrl}${cleanPath}`;

    const bodyString = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'REOBOTE-API-Client/1.0',
    };

    // Autenticação com o Base44
    if (config.base44.apiKey) {
      headers['x-api-key'] = config.base44.apiKey;
      headers['Authorization'] = `Bearer ${config.base44.apiKey}`;
    }

    // Assinatura HMAC de segurança se houver segredo de webhook compartilhado
    if (config.base44.webhookSecret) {
      const signature = crypto
        .createHmac('sha256', config.base44.webhookSecret)
        .update(bodyString)
        .digest('hex');
      headers['x-webhook-signature'] = signature;
    }

    logger.info(`Enviando atualização para o Base44: ${fullUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.base44.requestTimeoutMs);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: unknown;
      const text = await response.text();
      try {
        responseData = text ? JSON.parse(text) : {};
      } catch {
        responseData = { raw: text };
      }

      if (!response.ok) {
        logger.error(`Base44 retornou status de erro: ${response.status}`, {
          url: fullUrl,
          response: responseData,
        });
        throw new Error(`Base44 retornou HTTP ${response.status}: ${JSON.stringify(responseData)}`);
      }

      logger.info(`Base44 notificado com sucesso (HTTP ${response.status})`);
      return {
        status: response.status,
        data: responseData as T,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(`Timeout ao comunicar com o Base44 (${config.base44.requestTimeoutMs}ms)`);
        throw new Error(`Timeout na comunicação com a API do Base44.`);
      }
      logger.error('Falha ao comunicar com a API do Base44.', error);
      throw error;
    }
  }
}

export const base44Client = new Base44Client();
