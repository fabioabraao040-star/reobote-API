import { app } from './src/app.ts';
import { config } from './src/config/env.ts';
import { logger } from './src/utils/logger.ts';

async function startServer() {
  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`=======================================================`);
    logger.info(`🚀 REOBOTE API (Backend Puro) iniciada com sucesso!`);
    logger.info(`📡 Porta: ${config.port} | Ambiente: ${config.env}`);
    logger.info(`🔗 Base URL: http://0.0.0.0:${config.port}/api`);
    logger.info(`🩺 Health Check: http://0.0.0.0:${config.port}/api/health`);
    logger.info(`=======================================================`);
  });

  const shutdown = () => {
    logger.info('Encerrando servidor REOBOTE API graciosamente...');
    server.close(() => {
      logger.info('Servidor finalizado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  logger.error('Falha fatal ao iniciar o servidor da API:', err);
  process.exit(1);
});
