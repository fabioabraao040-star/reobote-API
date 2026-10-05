import https from 'https';
import fs from 'fs';
import { config } from '../../config/env.ts';
import { logger } from '../../utils/logger.ts';
import { EfiOAuthToken } from './efi.types.ts';

export class EfiClient {
  private cachedToken: EfiOAuthToken | null = null;
  private httpsAgent: https.Agent | null = null;
  private isSimulation: boolean = false;

  constructor() {
    this.initAgent();
  }

  private getBaseUrl(): string {
    return config.efi.environment === 'producao'
      ? 'https://pix.api.efipay.com.br'
      : 'https://pix-h.api.efipay.com.br';
  }

  public isConfigured(): boolean {
    return Boolean(
      config.efi.clientId &&
      config.efi.clientSecret &&
      (config.efi.certificate || config.efi.simulationMode)
    );
  }

  private initAgent(): void {
    if (!config.efi.certificate) {
      if (config.efi.simulationMode || config.env !== 'production') {
        this.isSimulation = true;
        logger.info('Efí Client: Operando em modo de simulação seguro (credenciais Efí ausentes ou EFI_SIMULATION_MODE ativo).');
      } else {
        logger.warn('Efí Client: Certificado Efí (EFI_CERTIFICATE) não configurado.');
      }
      return;
    }

    try {
      let certBuffer: Buffer;

      // Verifica se o valor configurado é um caminho de arquivo existente ou uma string base64
      if (fs.existsSync(config.efi.certificate)) {
        certBuffer = fs.readFileSync(config.efi.certificate);
      } else {
        // Trata como string codificada em base64 (padrão recomendado para Vercel)
        certBuffer = Buffer.from(config.efi.certificate.trim(), 'base64');
      }

      // Detecta se é PEM ou PFX/P12
      const certString = certBuffer.toString('utf-8');
      if (certString.includes('-----BEGIN CERTIFICATE-----')) {
        let keyBuffer: Buffer | undefined;
        if (config.efi.privateKey) {
          if (fs.existsSync(config.efi.privateKey)) {
            keyBuffer = fs.readFileSync(config.efi.privateKey);
          } else {
            keyBuffer = Buffer.from(config.efi.privateKey.trim(), 'base64');
          }
        }

        this.httpsAgent = new https.Agent({
          cert: certBuffer,
          key: keyBuffer || certBuffer,
          keepAlive: true,
          timeout: config.efi.requestTimeoutMs,
        });
      } else {
        // Arquivo P12 / PFX
        this.httpsAgent = new https.Agent({
          pfx: certBuffer,
          passphrase: config.efi.certificatePassword || '',
          keepAlive: true,
          timeout: config.efi.requestTimeoutMs,
        });
      }

      logger.info(`Efí Client: Agente mTLS configurado com sucesso para ambiente [${config.efi.environment}].`);
    } catch (error) {
      logger.error('Falha ao inicializar o certificado mTLS da Efí.', error);
      if (config.env !== 'production') {
        this.isSimulation = true;
        logger.warn('Efí Client: Alternando para modo de simulação de desenvolvimento.');
      }
    }
  }

  /**
   * Obtém token de autenticação OAuth2 da Efí utilizando credenciais e mTLS.
   */
  public async getAccessToken(): Promise<string> {
    if (this.isSimulation) {
      return 'simulated_efi_access_token_' + Date.now();
    }

    // Retorna token em cache se ainda válido com margem de segurança de 60s
    if (this.cachedToken) {
      const now = Date.now();
      const expirationTime = this.cachedToken.obtained_at + (this.cachedToken.expires_in - 60) * 1000;
      if (now < expirationTime) {
        return this.cachedToken.access_token;
      }
    }

    const authString = Buffer.from(`${config.efi.clientId}:${config.efi.clientSecret}`).toString('base64');
    const url = `${this.getBaseUrl()}/oauth/token`;

    try {
      const response = await this.executeRequest<{ access_token: string; token_type: string; expires_in: number; scope: string }>(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grant_type: 'client_credentials' }),
        }
      );

      this.cachedToken = {
        ...response,
        obtained_at: Date.now(),
      };

      logger.info('Token de autenticação Efí renovado com sucesso.');
      return this.cachedToken.access_token;
    } catch (error) {
      logger.error('Falha na autenticação OAuth2 com a API da Efí.', error);
      throw new Error('Falha na comunicação de autenticação com o provedor de pagamento (Efí).');
    }
  }

  /**
   * Executa requisição HTTP segura para a API da Efí com timeout e mTLS.
   */
  public async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    if (this.isSimulation) {
      return this.handleSimulationRequest<T>(path, options);
    }

    const token = await this.getAccessToken();
    const url = `${this.getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    return this.executeRequest<T>(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  private executeRequest<T>(url: string, options: { method: string; headers: Record<string, string>; body?: string }): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const reqOptions: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: options.headers,
        agent: this.httpsAgent || undefined,
        timeout: config.efi.requestTimeoutMs,
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const status = res.statusCode || 500;
          let parsedBody: unknown;

          try {
            parsedBody = data ? JSON.parse(data) : {};
          } catch {
            parsedBody = { raw: data };
          }

          if (status >= 200 && status < 300) {
            resolve(parsedBody as T);
          } else {
            logger.error(`Efí API respondeu com status ${status}`, {
              url: parsedUrl.pathname,
              status,
              response: parsedBody,
            });
            reject(new Error(`Erro Efí (${status}): ${JSON.stringify(parsedBody)}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout na chamada para a Efí API após ${config.efi.requestTimeoutMs}ms`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  /**
   * Simulação segura de respostas quando credenciais reais da Efí ainda não foram inseridas no Vercel
   */
  private handleSimulationRequest<T>(path: string, options: { method?: string; body?: unknown }): T {
    const timestamp = Date.now().toString(36);
    const mockTxid = `REOBOTE${timestamp.toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (path.includes('/v2/cob') && options.method === 'POST') {
      const body = options.body as { valor?: { original?: string }; solicitacaoPagador?: string } | undefined;
      const mockLocId = Math.floor(100000 + Math.random() * 900000);
      return {
        txid: mockTxid,
        revisao: 0,
        loc: {
          id: mockLocId,
          location: `pix.api.efipay.com.br/qr/v2/${mockTxid}`,
          tipoCob: 'cob',
          criacao: new Date().toISOString(),
        },
        status: 'ATIVA',
        valor: {
          original: body?.valor?.original || '10.00',
        },
        chave: config.efi.pixKey || 'reobote-pix-simulado@efipay.com.br',
        solicitacaoPagador: body?.solicitacaoPagador || 'Cobrança Reobote',
        criacao: new Date().toISOString(),
      } as unknown as T;
    }

    if (path.includes('/qrcode')) {
      const mockPixCopiaECola = `00020126580014br.gov.bcb.pix0136${mockTxid}520400005303986540510.005802BR5916REOBOTE SISTEMAS6009SAO PAULO62070503***6304ABCD`;
      return {
        qrcode: mockPixCopiaECola,
        imagemQrcode: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><text x="50%" y="50%" fill="%2338bdf8" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14">QR CODE PIX SIMULADO</text></svg>',
        linkVisualizacao: `https://pix.api.efipay.com.br/qr/v2/${mockTxid}`,
      } as unknown as T;
    }

    if (path.includes('/v2/cob/')) {
      const txidFromPath = path.split('/').pop() || mockTxid;
      return {
        txid: txidFromPath,
        revisao: 0,
        status: 'ATIVA',
        valor: {
          original: '15.00',
        },
        chave: config.efi.pixKey || 'reobote-chave-simulada',
        solicitacaoPagador: 'Pagamento Reobote',
        criacao: new Date().toISOString(),
      } as unknown as T;
    }

    return {} as T;
  }
}

export const efiClient = new EfiClient();
