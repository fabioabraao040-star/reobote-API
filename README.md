# REOBOTE API - Intermediário Efí Pay & Base44

A **REOBOTE API** é uma API REST backend intermediária profissional, segura e de alta performance, desenvolvida para conectar o sistema **REOBOTE SISTEMAS** (desenvolvido no Base44 Free) à API de pagamentos PIX da **Efí** (antiga Gerencianet).

O projeto foi projetado com arquitetura desacoplada e pronto para ser executado tanto localmente quanto hospedado como **Serverless no Vercel**.

---

## 🏗️ 1. Arquitetura do Sistema

```
[ Base44 REOBOTE ]
        │  (1. Solicita cobrança com API Key)
        ▼
[ REOBOTE API (Vercel) ]
        │  (2. OAuth2 + mTLS com Certificado)
        ▼
[ API Efí (Gerencianet) ] ───► Gera Cobrança Pix & QR Code
        │
        │ (3. Devolve QR Code e Copia e Cola)
        ▼
[ Base44 REOBOTE ] ───► Exibe Pix ao Usuário / Motoboy
        │
        ▼ (Pagamento realizado no banco do cliente)
[ Efí Webhook ]
        │ (4. Notificação de pagamento instantâneo)
        ▼
[ REOBOTE API (Vercel) ] ───► Valida evento + Idempotência (anti-duplicação)
        │
        │ (5. Atualiza status via HMAC-SHA256)
        ▼
[ Base44 REOBOTE ] ───► Confirma pagamento e libera créditos
```

### Princípios de Segurança Aplicados:
* **Credenciais Protegidas**: As chaves da Efí (`Client_Id`, `Client_Secret`, Certificado `.p12`) nunca ficam expostas no Base44 nem no navegador.
* **Autenticação Base44**: Todas as chamadas do Base44 para a REOBOTE API são autenticadas via header `x-api-key` ou `Authorization: Bearer`.
* **Idempotência**: Prevenção ativa de cobranças duplicadas e de múltiplos disparos de webhooks idênticos.
* **Sanitização de Logs**: Nenhum segredo, token, senha ou certificado é registrado nos logs.
* **Rate Limiting**: Proteção contra ataques de negação de serviço e força bruta.
* **Timeouts & Resiliência**: Controle de tempo limite para requisições externas à Efí e ao Base44.

---

## 📡 2. Endpoints da API

### `POST /api/efi/criar-cobranca`
Recebe a solicitação do Base44 e cria a cobrança imediata via PIX na Efí.

* **Autenticação**: Obrigatória (`x-api-key` ou `Authorization: Bearer <token>`).
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: SUA_REOBOTE_API_KEY`
  * `x-idempotency-key` *(opcional)*: Chave única para evitar cobrança duplicada.

**Corpo da Requisição (Body JSON):**
```json
{
  "id_pedido": "PED-10293",
  "id_motoboy": "MOTO-44",
  "valor": 15.00,
  "descricao": "Recarga de Créditos Reobote",
  "referencia_externa": "REF-EXT-2026",
  "expiracao_segundos": 3600
}
```

**Resposta de Sucesso (HTTP 201):**
```json
{
  "sucesso": true,
  "id_cobranca": "123456",
  "identificador_transacao": "7978c0c97ea847e78e3199663707ecd9",
  "status": "PENDENTE",
  "valor": 15.00,
  "codigo_pix": "00020126580014br.gov.bcb.pix01367978c0c97ea847e78e3199663707ecd9520400005303986540515.005802BR5916REOBOTE SISTEMAS6009SAO PAULO62070503***6304ABCD",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "pix_copia_e_cola": "00020126580014br.gov.bcb.pix01367978c0c97ea847e78e3199663707ecd9520400005303986540515.005802BR5916REOBOTE SISTEMAS6009SAO PAULO62070503***6304ABCD",
  "data_criacao": "2026-10-04T18:00:00.000Z",
  "detalhes": {
    "id_pedido": "PED-10293",
    "id_motoboy": "MOTO-44",
    "referencia_externa": "REF-EXT-2026"
  }
}
```

---

### `GET /api/efi/status/:id`
Consulta o status de uma cobrança existente na Efí através do `txid` ou identificador da cobrança.

* **Autenticação**: Obrigatória (`x-api-key: SUA_REOBOTE_API_KEY`).
* **Parâmetro de URL**: `:id` (o `txid` da cobrança).

**Exemplo de Resposta (HTTP 200):**
```json
{
  "sucesso": true,
  "id_cobranca": "123456",
  "identificador_transacao": "7978c0c97ea847e78e3199663707ecd9",
  "status": "PAGO",
  "valor": 15.00,
  "data": "2026-10-04T18:05:12.000Z",
  "data_criacao": "2026-10-04T18:00:00.000Z",
  "data_pagamento": "2026-10-04T18:05:12.000Z",
  "dados_para_base44": {
    "id_cobranca": "123456",
    "id_transacao": "7978c0c97ea847e78e3199663707ecd9",
    "status": "PAGO",
    "valor": 15.00,
    "data_pagamento": "2026-10-04T18:05:12.000Z",
    "data_atualizacao": "2026-10-04T18:05:13.000Z",
    "id_pedido": "PED-10293",
    "id_motoboy": "MOTO-44",
    "referencia_externa": "REF-EXT-2026"
  }
}
```

---

### `POST /api/efi/webhook`
Endpoint configurado na Efí para receber notificações de pagamentos instantâneos PIX.

* **Autenticação**: Validação de handshake Efí e verificação opcional via secret (`?secret=...` ou header `x-webhook-secret`).
* **Comportamento**:
  1. Identifica os dados da notificação (`txid`, `endToEndId`, `valor`, `horario`).
  2. Valida idempotência para descartar notificações duplicadas já processadas.
  3. Mapeia o status (`PENDENTE`, `PAGO`, `EXPIRADO`, `CANCELADO`).
  4. Envia imediatamente uma requisição `POST` para o endpoint configurado no Base44 (`BASE44_API_URL + BASE44_PAYMENT_UPDATE_ENDPOINT`).
  5. Responde HTTP 200 para a Efí.

---

### `GET /api/health`
Retorna o status de saúde da API, serviços configurados e diagnósticos do sistema.

### `GET /api/docs`
Retorna a especificação técnica completa da API em JSON.

---

## ⚙️ 3. Variáveis de Ambiente (.env)

Copie o modelo `.env.example` para `.env`:

```bash
cp .env.example .env
```

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `PORT` | Porta do servidor local | `3000` |
| `NODE_ENV` | Ambiente de execução | `development` ou `production` |
| `REOBOTE_API_KEY` | Chave que o Base44 deve enviar para acessar esta API | `reobote_secret_token_123` |
| `EFI_ENVIRONMENT` | Ambiente Efí | `homologacao` ou `producao` |
| `EFI_CLIENT_ID` | Client ID da aplicação Efí | `Client_Id_...` |
| `EFI_CLIENT_SECRET` | Client Secret da aplicação Efí | `Client_Secret_...` |
| `EFI_CERTIFICATE` | Certificado `.p12` codificado em **Base64** | `MIIG+AIBAzCCBq...` |
| `EFI_CERTIFICATE_PASSWORD`| Senha do certificado (se houver) | `minha_senha` |
| `EFI_PIX_KEY` | Chave Pix cadastrada na conta Efí | `sua-chave-pix` |
| `BASE44_API_URL` | URL base da API do Base44 | `https://sua-empresa.base44.app/api` |
| `BASE44_API_KEY` | Token de autorização para enviar ao Base44 | `token_base44_abc` |
| `BASE44_WEBHOOK_SECRET` | Chave secreta para assinatura HMAC-SHA256 | `segredo_hmac_base44` |
| `BASE44_PAYMENT_UPDATE_ENDPOINT` | Rota no Base44 que recebe as atualizações | `/pagamentos/webhook` |

---

## 💻 4. Como Executar Localmente

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar o Arquivo `.env`
Crie o arquivo `.env` com suas configurações ou use o modo simulação se ainda não possuir credenciais da Efí.

### 3. Iniciar o Servidor
```bash
npm run dev
```

A API estará disponível em:
* Endpoints REST: `http://localhost:3000/api`
* Documentação JSON: `http://localhost:3000/api/docs`
* Diagnóstico: `http://localhost:3000/api/health`

---

## 🚀 5. Como Publicar no Vercel

O projeto já inclui o arquivo `vercel.json` e a rota serverless `api/index.ts`.

### Passo a Passo no Vercel:

1. **Subir o Código**: Suba o código para um repositório no GitHub ou GitLab.
2. **Importar no Vercel**:
   * Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**.
   * Importe o repositório da `REOBOTE API`.
3. **Converter o Certificado da Efí para Base64**:
   O Vercel não permite upload de arquivos `.p12` diretamente. Converta seu arquivo de certificado em uma string base64:
   * **Linux / macOS**:
     ```bash
     base64 -w 0 certificado.p12 > cert_base64.txt
     ```
   * **Windows (PowerShell)**:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.p12")) | Out-File cert_base64.txt
     ```
4. **Cadastrar as Variáveis de Ambiente no Vercel**:
   Acesse **Project Settings → Environment Variables** e adicione:
   * `EFI_ENVIRONMENT`: `producao` (ou `homologacao`)
   * `EFI_CLIENT_ID`: seu Client_Id
   * `EFI_CLIENT_SECRET`: seu Client_Secret
   * `EFI_CERTIFICATE`: cole todo o conteúdo do `cert_base64.txt`
   * `EFI_PIX_KEY`: sua chave Pix
   * `REOBOTE_API_KEY`: uma chave forte para autenticar o Base44
   * `BASE44_API_URL`: URL da API do seu Base44
   * `BASE44_API_KEY`: token do Base44
   * `BASE44_WEBHOOK_SECRET`: segredo compartilhado
5. **Deploy**:
   * Clique em **Deploy**. Sua API estará no ar com URL fornecida pelo Vercel (ex: `https://reobote-api.vercel.app`).

---

## 🔔 6. Como Configurar o Webhook na Efí

1. Acesse o painel da Efí (**API → Configurações de Webhook Pix**).
2. Adicione a URL do webhook apontando para a sua API no Vercel:
   ```
   https://reobote-api.vercel.app/api/efi/webhook
   ```
3. A Efí fará um disparo de validação para a URL. A **REOBOTE API** responderá automaticamente `200 OK` validando a URL com sucesso.
4. Conecte sua chave Pix ao webhook cadastrado.

---

## 🔗 7. Como Conectar o Base44

No Base44 (ou no seu fluxo de automação / backend):

### 1. Criar Cobrança:
Faça uma requisição HTTP POST para a REOBOTE API:
* **URL**: `https://sua-api.vercel.app/api/efi/criar-cobranca`
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: SUA_REOBOTE_API_KEY`
* **Body**:
  ```json
  {
    "id_pedido": "{{id_pedido}}",
    "id_motoboy": "{{id_motoboy}}",
    "valor": 20.00,
    "descricao": "Crédito Motoboy",
    "referencia_externa": "{{id_transacao_base44}}"
  }
  ```
* Armazene o `identificador_transacao` (txid) no registro do pedido no Base44 e exiba o `codigo_pix` ou `qr_code` para pagamento.

### 2. Receber Confirmação de Pagamento:
Quando a cobrança for paga, a REOBOTE API enviará automaticamente para o Base44:
* **URL**: `BASE44_API_URL + BASE44_PAYMENT_UPDATE_ENDPOINT`
* **Headers**:
  * `Authorization: Bearer SUA_BASE44_API_KEY`
  * `x-webhook-signature`: Assinatura HMAC-SHA256
* **Body enviado**:
  ```json
  {
    "id_cobranca": "123456",
    "id_transacao": "7978c0c97ea847e78e3199663707ecd9",
    "referencia_externa": "REF-EXT-2026",
    "id_pedido": "PED-10293",
    "id_motoboy": "MOTO-44",
    "valor": 20.00,
    "status": "PAGO",
    "data_pagamento": "2026-10-04T18:05:12.000Z",
    "data_atualizacao": "2026-10-04T18:05:13.000Z"
  }
  ```
* O Base44 processa o payload e adiciona os créditos ao motoboy!

---

## 🧪 8. Testes com cURL

### Criar Cobrança Pix:
```bash
curl -X POST http://localhost:3000/api/efi/criar-cobranca \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_chave_secreta_reobote_base44" \
  -d '{
    "id_pedido": "PED-9988",
    "id_motoboy": "MOTO-12",
    "valor": 10.00,
    "descricao": "Teste de Recarga Reobote"
  }'
```

### Consultar Status:
```bash
curl -X GET http://localhost:3000/api/efi/status/7978c0c97ea847e78e3199663707ecd9 \
  -H "x-api-key: sua_chave_secreta_reobote_base44"
```

### Verificar Saúde da API:
```bash
curl -X GET http://localhost:3000/api/health
```

---

## 🔒 9. Mapeamento de Status

| Status Efí | Status REOBOTE | Ação no Base44 |
| :--- | :--- | :--- |
| `ATIVA` | `PENDENTE` | Aguardando pagamento |
| `CONCLUIDA` | `PAGO` | Liberar créditos do motoboy |
| `EXPIRADA` | `EXPIRADO` | Cobrança expirada |
| `REMOVIDA_PELO_USUARIO_RECEBEDOR` | `CANCELADO` | Cobrança cancelada |

---

Desenvolvido para **REOBOTE SISTEMAS**.
