import type { IncomingMessage, ServerResponse } from 'http';
import { app } from '../src/app.ts';

/**
 * Ponto de entrada Serverless para o Vercel.
 * Exporta o app Express para execução sob demanda nas Edge/Node.js Functions do Vercel.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req, res);
}
