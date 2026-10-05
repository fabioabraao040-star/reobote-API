import express, { Express, Request, Response } from 'express';
import { corsMiddleware } from './middleware/cors.middleware.ts';
import { requestLoggerMiddleware } from './middleware/logger.middleware.ts';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.ts';
import { apiRouter } from './routes/index.ts';

export function createApp(): Express {
  const app = express();

  // Desativa header 'X-Powered-By' por segurança
  app.disable('x-powered-by');

  // Middlewares de Parsing e Segurança
  app.use(corsMiddleware);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Middleware profissional de Logging com Winston e PII Sanitizer
  app.use(requestLoggerMiddleware);

  // Headers de Segurança
  app.use((_req: Request, res: Response, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Rotas da API sob o prefixo /api
  app.use('/api', apiRouter);

  // Painel Visual de Monitoramento na raiz (GET /)
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REOBOTE API - Painel de Monitoramento</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #000000; color: #FFFFFF; font-family: system-ui, -apple-system, sans-serif; }
    .card-bg { background-color: #111111; border: 1px solid #222222; }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased">
  <!-- Header -->
  <header class="border-b border-[#222222] bg-[#111111]/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700] font-bold text-lg">
          R
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white">REOBOTE API</h1>
          <p class="text-xs text-[#CCCCCC]">Gateway de integração entre Base44 e Efí</p>
        </div>
      </div>
      <button onclick="openDiagnosticModal()" class="px-4 py-2 rounded-lg bg-[#FFD700] text-black font-semibold text-xs hover:bg-[#e6c200] transition-colors flex items-center gap-1.5 shadow-md">
        🧪 TESTAR API
      </button>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
    
    <!-- Main Status Card -->
    <div class="card-bg rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
      <div class="flex items-center gap-4">
        <div id="main-status-dot" class="w-4 h-4 rounded-full bg-yellow-500 animate-pulse"></div>
        <div>
          <div class="text-xs font-semibold text-[#CCCCCC] uppercase tracking-wider">Estado do Gateway</div>
          <h2 class="text-2xl font-extrabold text-white">REOBOTE API</h2>
          <p id="main-status-text" class="text-sm text-[#CCCCCC]">Verificando status operacional...</p>
        </div>
      </div>
      <div id="main-status-badge" class="px-4 py-2 rounded-xl text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono">
        VERIFICANDO...
      </div>
    </div>

    <!-- Services Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- API -->
      <div class="card-bg rounded-xl p-4 flex flex-col gap-2">
        <div class="text-xs text-[#CCCCCC]">API</div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span class="text-sm font-semibold text-white">Online</span>
        </div>
      </div>

      <!-- Base44 -->
      <div class="card-bg rounded-xl p-4 flex flex-col gap-2">
        <div class="text-xs text-[#CCCCCC]">BASE44</div>
        <div class="flex items-center gap-2">
          <span id="base44-dot" class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          <span id="base44-text" class="text-sm font-semibold text-white">🟡 Configurado</span>
        </div>
      </div>

      <!-- Efí -->
      <div class="card-bg rounded-xl p-4 flex flex-col gap-2">
        <div class="text-xs text-[#CCCCCC]">EFÍ</div>
        <div class="flex items-center gap-2">
          <span id="efi-dot" class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          <span id="efi-text" class="text-sm font-semibold text-white">🟡 Configurado</span>
        </div>
      </div>

      <!-- Webhook -->
      <div class="card-bg rounded-xl p-4 flex flex-col gap-2">
        <div class="text-xs text-[#CCCCCC]">WEBHOOK</div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span class="text-sm font-semibold text-white">🟢 Online</span>
        </div>
      </div>
    </div>

    <!-- Endpoints & API Info Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Endpoints Section -->
      <div class="lg:col-span-2 card-bg rounded-2xl p-6 flex flex-col gap-4">
        <h3 class="text-sm font-bold text-[#FFD700] uppercase tracking-wider">Endpoints principais</h3>
        <div class="flex flex-col gap-3 font-mono text-xs">
          
          <div class="p-3 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">GET</span>
              <span class="text-white">/api/health</span>
            </div>
            <span class="text-[#CCCCCC] text-[11px]">Diagnóstico</span>
          </div>

          <div class="p-3 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">POST</span>
              <span class="text-white">/api/efi/criar-cobranca</span>
            </div>
            <span class="text-[#CCCCCC] text-[11px]">Criar Pix</span>
          </div>

          <div class="p-3 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">GET</span>
              <span class="text-white">/api/efi/status/:id</span>
            </div>
            <span class="text-[#CCCCCC] text-[11px]">Consultar Status</span>
          </div>

          <div class="p-3 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">POST</span>
              <span class="text-white">/api/efi/webhook</span>
            </div>
            <span class="text-[#CCCCCC] text-[11px]">Webhook Efí</span>
          </div>

        </div>
      </div>

      <!-- API Info Section -->
      <div class="card-bg rounded-2xl p-6 flex flex-col gap-4">
        <h3 class="text-sm font-bold text-[#FFD700] uppercase tracking-wider">Informações da API</h3>
        <div class="flex flex-col gap-3 text-xs">
          <div class="flex justify-between py-1.5 border-b border-[#222222]">
            <span class="text-[#CCCCCC]">REOBOTE API</span>
            <span class="font-semibold text-white">Gateway</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[#222222]">
            <span class="text-[#CCCCCC]">Versão</span>
            <span class="font-semibold text-white">1.0.0</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[#222222]">
            <span class="text-[#CCCCCC]">Ambiente</span>
            <span id="env-badge" class="font-semibold text-white">Production</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[#222222]">
            <span class="text-[#CCCCCC]">Runtime</span>
            <span class="font-semibold text-white">Node.js</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[#222222]">
            <span class="text-[#CCCCCC]">Framework</span>
            <span class="font-semibold text-white">Express</span>
          </div>
          <div class="flex justify-between py-1.5">
            <span class="text-[#CCCCCC]">Deploy</span>
            <span class="font-semibold text-white">Vercel</span>
          </div>
        </div>
      </div>

    </div>

  </main>

  <!-- Diagnostic Modal -->
  <div id="diag-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="card-bg rounded-2xl max-w-lg w-full p-6 flex flex-col gap-5 border border-[#333333] shadow-2xl">
      <div class="flex items-center justify-between border-b border-[#222222] pb-3">
        <div class="flex items-center gap-2">
          <span class="text-lg">🧪</span>
          <h3 class="text-base font-bold text-white">Diagnóstico e Teste Seguro da API</h3>
        </div>
        <button onclick="closeDiagnosticModal()" class="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1">✕</button>
      </div>

      <div id="diag-content" class="flex flex-col gap-3 text-xs font-mono">
        <div class="text-zinc-400 animate-pulse">Executando testes diagnósticos seguros...</div>
      </div>

      <div id="diag-summary" class="p-3 rounded-xl bg-black/60 border border-[#222222] text-xs font-bold text-center">
        AGUARDANDO RESULTADOS
      </div>

      <div class="flex justify-end pt-2">
        <button onclick="closeDiagnosticModal()" class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors">
          Fechar
        </button>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="border-t border-[#222222] py-4 text-center text-xs text-[#CCCCCC]">
    REOBOTE API • Base44 Gateway • Integrado com Efí Pay
  </footer>

  <script>
    let globalHealthData = null;

    async function updateStatus() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        globalHealthData = data;
        if (data && data.sucesso) {
          document.getElementById('main-status-dot').className = 'w-4 h-4 rounded-full bg-emerald-500';
          document.getElementById('main-status-text').innerText = 'API operacional';
          document.getElementById('main-status-badge').className = 'px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono';
          document.getElementById('main-status-badge').innerText = '🟢 ONLINE';

          if (data.vercelEnv) {
            document.getElementById('env-badge').innerText = data.vercelEnv;
          }

          if (data.status_servicos?.base44?.configurado) {
            document.getElementById('base44-dot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
            document.getElementById('base44-text').innerText = '🟢 Conectado';
          } else {
            document.getElementById('base44-dot').className = 'w-2.5 h-2.5 rounded-full bg-yellow-500';
            document.getElementById('base44-text').innerText = '🟡 Configurado';
          }

          if (data.status_servicos?.efi?.configurado) {
            document.getElementById('efi-dot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
            document.getElementById('efi-text').innerText = data.status_servicos.efi.modo_simulacao ? '🟡 Simulação' : '🟢 Conectado';
          } else {
            document.getElementById('efi-dot').className = 'w-2.5 h-2.5 rounded-full bg-yellow-500';
            document.getElementById('efi-text').innerText = '🟡 Configurado';
          }
        } else {
          throw new Error('Health check falhou');
        }
      } catch (err) {
        document.getElementById('main-status-dot').className = 'w-4 h-4 rounded-full bg-red-500';
        document.getElementById('main-status-text').innerText = 'Serviço indisponível';
        document.getElementById('main-status-badge').className = 'px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 font-mono';
        document.getElementById('main-status-badge').innerText = '🔴 OFFLINE';
      }
    }

    function openDiagnosticModal() {
      document.getElementById('diag-modal').classList.remove('hidden');
      runDiagnostics();
    }

    function closeDiagnosticModal() {
      document.getElementById('diag-modal').classList.add('hidden');
    }

    async function runDiagnostics() {
      const container = document.getElementById('diag-content');
      const summary = document.getElementById('diag-summary');
      container.innerHTML = '<div class="text-zinc-400 animate-pulse p-2">Executando testes diagnósticos seguros...</div>';
      summary.className = 'p-3 rounded-xl bg-black/60 border border-[#222222] text-xs font-bold text-center text-yellow-400';
      summary.innerText = 'TESTANDO...';

      let hasError = false;
      let errorDetails = [];

      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        globalHealthData = data;

        const apiOk = data && data.sucesso;
        const authOk = data?.status_servicos?.autenticacao?.configurada;
        const base44Ok = data?.status_servicos?.base44?.url_definida;
        const efiMissing = data?.status_servicos?.efi?.missing_vars || [];
        const efiOk = efiMissing.length === 0;
        const webhookOk = data?.status_servicos?.webhook?.disponivel;
        const envName = data?.vercelEnv || 'Production';

        if (!apiOk) { hasError = true; errorDetails.push('API: /api/health falhou.'); }
        if (!authOk) { hasError = true; errorDetails.push('AUTENTICAÇÃO: REOBOTE_API_KEY ausente.'); }
        if (!base44Ok) { hasError = true; errorDetails.push('BASE44: BASE44_API_URL ausente.'); }
        if (!efiOk) { hasError = true; errorDetails.push('EFÍ: Variáveis ausentes (' + efiMissing.join(', ') + ').'); }
        if (!webhookOk) { hasError = true; errorDetails.push('WEBHOOK: Endpoint indisponível.'); }

        let html = '';

        // 1. API
        html += \`<div class="p-2.5 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
          <span>1. API (GET /api/health)</span>
          <span class="\${apiOk ? 'text-emerald-400' : 'text-red-400'}">\${apiOk ? '🟢 OK' : '🔴 ERRO'}</span>
        </div>\`;

        // 2. Autenticação
        html += \`<div class="p-2.5 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
          <span>2. AUTENTICAÇÃO (Base44 ↔ API)</span>
          <span class="\${authOk ? 'text-emerald-400' : 'text-red-400'}">\${authOk ? '🟢 CONFIGURADA' : '🔴 AUSENTE'}</span>
        </div>\`;

        // 3. Base44
        html += \`<div class="p-2.5 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
          <span>3. BASE44 (BASE44_API_URL)</span>
          <span class="\${base44Ok ? 'text-emerald-400' : 'text-red-400'}">\${base44Ok ? '🟢 CONFIGURADO' : '🔴 AUSENTE'}</span>
        </div>\`;

        // 4. Efí
        html += \`<div class="p-2.5 rounded-lg bg-black/40 border border-[#222222] flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span>4. EFÍ (Credenciais e mTLS)</span>
            <span class="\${efiOk ? 'text-emerald-400' : 'text-red-400'}">\${efiOk ? '🟢 CONFIGURADA' : '🔴 CONFIGURAÇÃO INCOMPLETA'}</span>
          </div>
          \${efiMissing.length > 0 ? '<div class="text-[10px] text-red-400">Variáveis faltando: ' + efiMissing.join(', ') + '</div>' : ''}
        </div>\`;

        // 5. Webhook
        html += \`<div class="p-2.5 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
          <span>5. WEBHOOK (/api/efi/webhook)</span>
          <span class="\${webhookOk ? 'text-emerald-400' : 'text-red-400'}">\${webhookOk ? '🟢 DISPONÍVEL' : '🔴 ERRO'}</span>
        </div>\`;

        // 6. Ambiente / Vercel
        html += \`<div class="p-2.5 rounded-lg bg-black/40 border border-[#222222] flex items-center justify-between">
          <span>6. AMBIENTE / VERCEL</span>
          <span class="text-blue-400">🟢 \${envName}</span>
        </div>\`;

        container.innerHTML = html;

        if (hasError) {
          summary.className = 'p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs font-bold text-center text-red-400';
          summary.innerHTML = '🔴 FORAM ENCONTRADOS PROBLEMAS<br/><span class="text-[10px] text-red-300 font-normal">' + errorDetails.join(' | ') + '</span>';
        } else {
          summary.className = 'p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs font-bold text-center text-emerald-400';
          summary.innerText = '🟢 SISTEMA OPERACIONAL';
        }

      } catch (e) {
        container.innerHTML = '<div class="text-red-400 p-2">Erro ao executar diagnóstico de rede.</div>';
        summary.className = 'p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs font-bold text-center text-red-400';
        summary.innerText = '🔴 FORAM ENCONTRADOS PROBLEMAS';
      }
    }

    updateStatus();
  </script>
</body>
</html>`);
  });

  app.get('/api', (_req: Request, res: Response) => {
    res.status(200).json({
      sistema: 'REOBOTE API',
      status: 'online',
      versao: '1.0.0',
      endpoints: [
        'POST /api/efi/criar-cobranca',
        'GET /api/efi/status/:id',
        'POST /api/efi/webhook',
      ],
    });
  });

  // Middleware de 404 para rotas não encontradas
  app.use(notFoundHandler);

  // Middleware global de tratamento de erros
  app.use(errorHandler);

  return app;
}

export const app = createApp();
