import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string;
  apiAuthToken: string; // Token required by Base44 to call REOBOTE API
  rateLimitMax: number;
  rateLimitWindowMs: number;
  
  // Efí Config
  efi: {
    clientId: string;
    clientSecret: string;
    certificate: string; // Base64 or file path
    privateKey?: string;
    certificatePassword?: string;
    environment: 'homologacao' | 'producao';
    pixKey: string;
    webhookSecret?: string;
    requestTimeoutMs: number;
    simulationMode: boolean; // Enables mock response when credentials are not configured yet
  };

  // Base44 Config
  base44: {
    apiUrl: string;
    apiKey: string;
    webhookSecret: string;
    paymentUpdateEndpoint: string;
    requestTimeoutMs: number;
  };
}

export const config: AppConfig = {
  env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  apiAuthToken: process.env.REOBOTE_API_KEY || process.env.API_AUTH_TOKEN || '',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),

  efi: {
    clientId: process.env.EFI_CLIENT_ID || '',
    clientSecret: process.env.EFI_CLIENT_SECRET || '',
    certificate: process.env.EFI_CERTIFICATE || '',
    privateKey: process.env.EFI_PRIVATE_KEY || '',
    certificatePassword: process.env.EFI_CERTIFICATE_PASSWORD || '',
    environment: (process.env.EFI_ENVIRONMENT === 'producao' ? 'producao' : 'homologacao'),
    pixKey: process.env.EFI_PIX_KEY || '',
    webhookSecret: process.env.EFI_WEBHOOK_SECRET || '',
    requestTimeoutMs: parseInt(process.env.EFI_TIMEOUT_MS || '12000', 10),
    simulationMode: process.env.EFI_SIMULATION_MODE === 'true' || (!process.env.EFI_CLIENT_ID && process.env.NODE_ENV !== 'production'),
  },

  base44: {
    apiUrl: process.env.BASE44_API_URL || '',
    apiKey: process.env.BASE44_API_KEY || '',
    webhookSecret: process.env.BASE44_WEBHOOK_SECRET || '',
    paymentUpdateEndpoint: process.env.BASE44_PAYMENT_UPDATE_ENDPOINT || '/pagamentos/webhook',
    requestTimeoutMs: parseInt(process.env.BASE44_TIMEOUT_MS || '10000', 10),
  },
};
