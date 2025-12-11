# AI Todo Copilot - Visão Geral Completa do Projeto

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Infraestrutura e Deploy](#infraestrutura-e-deploy)
4. [Arquitetura do Projeto](#arquitetura-do-projeto)
5. [Estrutura de Arquivos](#estrutura-de-arquivos)
6. [Fluxos de Dados](#fluxos-de-dados)
7. [Autenticação e Segurança](#autenticação-e-segurança)
8. [Realtime e Sincronização](#realtime-e-sincronização)
9. [Integração com N8N](#integração-com-n8n)
10. [Decisões de Design Importantes](#decisões-de-design-importantes)
11. [Variáveis de Ambiente](#variáveis-de-ambiente)
12. [Como Executar](#como-executar)

---

## 🎯 Visão Geral

**AI Todo Copilot** é uma aplicação de lista de tarefas (Todo List) moderna que combina:
- **Frontend React/Next.js** com atualizações em tempo real
- **Backend Supabase** (PostgreSQL + Realtime) - **Auto-hospedado**
- **Automação via N8N** que processa tarefas com IA (OpenAI) para melhorar títulos e gerar descrições
- **Infraestrutura Docker Swarm** com **Traefik** para roteamento e domínio próprio

### Funcionalidades Principais
- ✅ Criar, editar, completar e deletar tarefas
- 🔐 Autenticação via Supabase (Email/Password e OAuth Google)
- ⚡ Atualizações em tempo real via Supabase Realtime
- 🤖 Processamento automático de tarefas via N8N (melhora títulos, gera descrições)
- 📱 Interface responsiva com Dark Mode
- 🐳 Deploy em Docker Swarm com Traefik

---

## 🛠 Stack Tecnológico

### Frontend
- **Next.js 16.0.8** (App Router) - Framework React com SSR/SSG
- **React 19.2.1** - Biblioteca de UI
- **TypeScript 5** - Tipagem estática
- **Tailwind CSS 3.4.17** - Framework CSS utilitário
- **Lucide React** - Ícones

### Backend & Infraestrutura
- **Supabase (Auto-hospedado)** - BaaS (Backend as a Service)
  - PostgreSQL (banco de dados)
  - Realtime (WebSocket para atualizações em tempo real)
  - Auth (autenticação e autorização)
  - **Deploy**: Docker Swarm
- **N8N** - Plataforma de automação de workflows
  - Processa tarefas via webhook
  - Integração com OpenAI para melhorar títulos
  - **Deploy**: Docker Swarm
- **Traefik** - Reverse Proxy e Load Balancer
  - Gerenciamento de domínio próprio
  - SSL/TLS automático (Let's Encrypt)
  - Roteamento para serviços Docker Swarm
- **Docker Swarm** - Orquestração de containers
  - Rede distribuída
  - Escalabilidade horizontal
  - Service discovery

### Dependências Principais
```json
{
  "@supabase/ssr": "^0.8.0",      // SSR-safe Supabase client
  "@supabase/supabase-js": "^2.87.1",  // Cliente Supabase
  "lucide-react": "^0.556.0"     // Ícones
}
```

---

## 🐳 Infraestrutura e Deploy

### Arquitetura de Infraestrutura

```
┌─────────────────────────────────────────────────────────┐
│                    Traefik (Reverse Proxy)               │
│              Domínio Próprio + SSL/TLS                   │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Next.js App │ │  Supabase  │ │    N8N     │
│  (Vercel ou │ │ (Auto-hosp) │ │ (Docker)   │
│  Docker)    │ │  (Docker)   │ │            │
└─────────────┘ └─────────────┘ └────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
            ┌──────────▼──────────┐
            │   Docker Swarm      │
            │   (Orquestração)    │
            └─────────────────────┘
```

### Docker Swarm

**Configuração**:
- Rede distribuída para comunicação entre serviços
- Service discovery automático
- Escalabilidade horizontal (múltiplos replicas)
- Health checks e restart policies

**Serviços Principais**:
1. **Supabase** (Auto-hospedado)
   - PostgreSQL
   - PostgREST (API REST)
   - Realtime (WebSocket)
   - Auth (GoTrue)
   - Storage (S3-compatible)

2. **N8N**
   - Workflow automation
   - Webhook endpoints
   - Integração com OpenAI

3. **Next.js App** (opcional em Docker)
   - Pode rodar em Vercel ou Docker Swarm
   - Se em Docker: container Node.js com Next.js

### Traefik Configuration

**Funções**:
- **Reverse Proxy**: Roteia requisições para serviços corretos
- **SSL/TLS**: Certificados Let's Encrypt automáticos
- **Load Balancing**: Distribui carga entre replicas
- **Service Discovery**: Detecta serviços Docker automaticamente

**Labels Docker Swarm** (exemplo):
```yaml
services:
  supabase:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.supabase.rule=Host(`supabase.seudominio.com`)"
      - "traefik.http.routers.supabase.tls.certresolver=letsencrypt"
  
  n8n:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(`n8n.seudominio.com`)"
      - "traefik.http.routers.n8n.tls.certresolver=letsencrypt"
```

### Domínio Próprio

**Configuração**:
- Domínio gerenciado pelo Traefik
- DNS apontando para IP do Traefik
- SSL/TLS automático via Let's Encrypt
- Subdomínios para cada serviço:
  - `app.seudominio.com` → Next.js App
  - `supabase.seudominio.com` → Supabase
  - `n8n.seudominio.com` → N8N

### Supabase Auto-hospedado

**Vantagens**:
- ✅ Controle total sobre dados
- ✅ Sem limites de uso
- ✅ Customização completa
- ✅ Integração com infraestrutura existente

**Componentes**:
- **PostgreSQL**: Banco de dados principal
- **PostgREST**: API REST automática
- **Realtime**: WebSocket server para updates
- **GoTrue**: Serviço de autenticação
- **Storage**: Sistema de arquivos (S3-compatible)
- **Kong**: API Gateway

**Configuração de Rede**:
- Comunicação interna via Docker Swarm network
- Exposição via Traefik com domínio próprio
- Firewall e segurança configurados

---

## 🏗 Arquitetura do Projeto

### Padrão: Next.js App Router (Server/Client Components)

```
┌─────────────────────────────────────────┐
│         Browser (Client)                 │
│  ┌───────────────────────────────────┐  │
│  │  TodoList.tsx (Client Component) │  │
│  │  - Estado local (React)           │  │
│  │  - Realtime subscription          │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼────────────────────────┘
                  │
         ┌────────▼────────┐
         │  API Routes     │
         │  /api/n8n-trigger│
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │                           │
┌───▼────┐              ┌───────▼───┐
│Supabase│              │    N8N    │
│(Auto-  │◄─────────────┤  Webhook  │
│hospedado│              │  (OpenAI) │
│Docker) │              │ (Docker)  │
└────────┘              └───────────┘
    │                           │
    └───────────┬───────────────┘
                │
        ┌───────▼────────┐
        │  Docker Swarm  │
        │  (Traefik)     │
        └────────────────┘
```

### Fluxo de Autenticação (PKCE)
1. Usuário clica em "Login com Google"
2. Redireciona para Supabase Auth (via Traefik → domínio próprio)
3. Supabase retorna para `/auth/callback?code=...`
4. Middleware **NÃO** intercepta `/auth/callback` (evita quebra PKCE)
5. Route Handler troca `code` por `session` (cookies)
6. Usuário autenticado

---

## 📁 Estrutura de Arquivos

```
ai-todo-copilot/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   └── n8n-trigger/
│   │       └── route.ts         # Webhook para N8N
│   ├── auth/                    # Autenticação
│   │   ├── page.tsx             # Página de login/signup
│   │   └── callback/
│   │       └── route.ts         # OAuth callback handler
│   ├── components/              # Componentes React
│   │   ├── TodoList.tsx         # Componente principal (lista)
│   │   ├── TodoItem.tsx         # Item individual da lista
│   │   ├── AuthGuard.tsx        # Proteção de rotas
│   │   └── Chatbot.tsx          # Chatbot (opcional)
│   ├── layout.tsx               # Layout raiz
│   ├── page.tsx                 # Página inicial
│   └── globals.css              # Estilos globais
│
├── lib/                         # Bibliotecas e utilitários
│   └── tasks.ts                 # Funções CRUD do banco
│
├── utils/                       # Utilitários
│   └── supabase/
│       ├── client.ts            # Cliente Supabase (Browser)
│       └── server.ts            # Cliente Supabase (Server)
│
├── middleware.ts                # Middleware Next.js (gerencia sessões)
├── package.json                 # Dependências
├── tsconfig.json               # Configuração TypeScript
└── tailwind.config.ts          # Configuração Tailwind
```

---

## 🔄 Fluxos de Dados

### 1. Criar Tarefa (Fluxo Completo)

```
Usuário digita "comprar leite"
    │
    ▼
[TodoList.tsx] handleAddTask()
    │
    ├─► 1. Optimistic Update (tempId)
    │   └─► Mostra tarefa imediatamente na UI
    │
    ├─► 2. createTask() → Supabase (via Traefik)
    │   └─► Salva no banco, retorna realId
    │
    ├─► 3. Swap tempId → realId (localmente)
    │   └─► Atualiza estado React
    │
    └─► 4. POST /api/n8n-trigger
        │
        └─► N8N Webhook recebe { taskId, title, user_id }
            │ (via Traefik → Docker Swarm network)
            │
            └─► N8N processa:
                ├─► Chama OpenAI para melhorar título
                ├─► Gera descrição (ex: lista de compras)
                └─► UPDATE tasks SET title=..., description=...
                    │ (via Supabase API → Traefik)
                    │
                    └─► Supabase Realtime emite evento
                        │ (WebSocket via Traefik)
                        │
                        └─► TodoList.tsx recebe UPDATE
                            │
                            └─► Refetch completo (getTasks)
                                └─► UI atualiza automaticamente
```

### 2. Atualização Realtime (Estratégia Refetch)

**Decisão de Design**: Em vez de fazer merge manual do estado, o sistema refaz o fetch completo quando recebe qualquer evento Realtime. Isso garante:
- ✅ Sem problemas de ID mismatch
- ✅ UI sempre sincronizada com banco
- ✅ Spinner "AI Optimizing" desaparece automaticamente

```typescript
// app/components/TodoList.tsx (linha 58-64)
async (payload: any) => {
  // DEADLINE FIX: Brute-force refresh to guarantee UI matches DB
  const freshTasks = await getTasks(supabase, user.id)
  setTasks(freshTasks || [])
}
```

### 3. Toggle/Edit/Delete (Optimistic UI)

Todas as ações usam **Optimistic UI**:
1. Atualiza estado local imediatamente (UX rápida)
2. Chama função do banco em background
3. Se falhar, Realtime corrige automaticamente

---

## 🔐 Autenticação e Segurança

### Estrutura de Autenticação

#### 1. Cliente Supabase (Browser)
**Arquivo**: `utils/supabase/client.ts`
- Usa `createBrowserClient` do `@supabase/ssr`
- Gerencia cookies automaticamente
- **Produção**: Cookies `Secure` habilitados automaticamente em HTTPS (via Traefik)

#### 2. Cliente Supabase (Server)
**Arquivo**: `utils/supabase/server.ts`
- Usa `createServerClient` do `@supabase/ssr`
- Acessa cookies via `next/headers`
- Usado em API Routes e Server Components

#### 3. Middleware
**Arquivo**: `middleware.ts`
- Intercepta todas as requisições (exceto `/auth/callback`)
- Atualiza sessão automaticamente
- **CRÍTICO**: Exclui `/auth/callback` do matcher para evitar quebra do PKCE

```typescript
matcher: [
  '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]
```

#### 4. OAuth Callback
**Arquivo**: `app/auth/callback/route.ts`
- Recebe `code` do Supabase
- Troca por `session` (cookies)
- Redireciona para home

### Segurança
- ✅ Row Level Security (RLS) no Supabase
- ✅ Todas as queries filtram por `user_id`
- ✅ API Routes verificam autenticação antes de chamar N8N
- ✅ Cookies seguros em produção (HTTPS via Traefik)
- ✅ Firewall e network policies no Docker Swarm
- ✅ SSL/TLS automático via Let's Encrypt (Traefik)

---

## ⚡ Realtime e Sincronização

### Configuração Realtime

**Arquivo**: `app/components/TodoList.tsx` (linha 43-75)

```typescript
const channel = supabase
  .channel(`realtime:tasks:${user.id}`)
  .on('postgres_changes', {
    event: '*',                    // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'tasks',
    filter: `user_id=eq.${user.id}`, // Apenas tarefas do usuário
  }, async (payload) => {
    // Refetch completo para garantir sincronização
    const freshTasks = await getTasks(supabase, user.id)
    setTasks(freshTasks || [])
  })
  .subscribe()
```

### Realtime em Infraestrutura Docker

**Configuração**:
- WebSocket via Traefik (upgrade HTTP → WS)
- Supabase Realtime exposto via Traefik
- Domínio próprio para WebSocket (ex: `wss://supabase.seudominio.com/realtime/v1`)
- Load balancing entre replicas do Realtime

### Por que Refetch em vez de Merge?

**Problema Original**: ID mismatch entre `tempId` (otimista) e `realId` (banco) causava eventos Realtime não aplicados.

**Solução**: Refetch completo garante:
- ✅ UI sempre reflete estado exato do banco
- ✅ Sem problemas de sincronização
- ✅ Spinner desaparece automaticamente (banco não tem `is_ai_processing`)

### Status do Realtime
O componente mostra status visual:
- 🟢 **Online** (SUBSCRIBED) - Conectado
- 🔴 **Offline** (disconnected/error) - Desconectado

---

## 🤖 Integração com N8N

### Fluxo N8N

1. **Trigger**: Webhook recebe POST de `/api/n8n-trigger`
2. **Payload**:
   ```json
   {
     "id": "task-uuid",
     "title": "comprar leite",
     "user_id": "user-uuid",
     "action": "improve_title"
   }
   ```
3. **Processamento N8N**:
   - Chama OpenAI para melhorar título
   - Gera descrição (ex: lista de compras detalhada)
   - Atualiza banco Supabase via SQL (via Traefik → Docker Swarm network)
4. **Resultado**: Realtime notifica frontend → UI atualiza

### API Route: `/api/n8n-trigger/route.ts`

**Segurança**:
- ✅ Verifica autenticação (`supabase.auth.getUser()`)
- ✅ Valida payload (`taskId`, `title`)
- ✅ Fire-and-forget (não bloqueia resposta)

**Variável de Ambiente**: `N8N_WEBHOOK_URL`
- URL completa: `https://n8n.seudominio.com/webhook/tasks` (via Traefik)

### Comunicação entre Serviços

**Docker Swarm Network**:
- Serviços se comunicam via network interna
- N8N acessa Supabase via service name (ex: `supabase-postgrest:8000`)
- Traefik expõe serviços externamente via domínio próprio

---

## 🎨 Decisões de Design Importantes

### 1. SSR-Safe Functions
**Problema**: Supabase client não pode ser singleton em SSR.

**Solução**: Todas as funções em `lib/tasks.ts` recebem o cliente como parâmetro:

```typescript
export async function getTasks(supabase: SupabaseClient, userId: string)
export async function createTask(supabase: SupabaseClient, title: string, userId: string)
```

### 2. Optimistic UI com ID Swap
**Problema**: Usuário quer feedback imediato, mas banco demora.

**Solução**:
1. Mostra tarefa com `tempId` imediatamente
2. Salva no banco → recebe `realId`
3. Troca `tempId` por `realId` localmente
4. Realtime sincroniza depois

### 3. Remoção de `is_ai_processing` do Schema
**Problema**: Coluna não existia no banco, causava erros.

**Solução**: 
- Removido de `lib/tasks.ts` (não insere/seleciona)
- Mantido apenas no estado React local (UI)
- Realtime refetch remove automaticamente

### 4. Refetch Strategy para Realtime
**Problema**: Merge manual de estado era frágil (ID mismatch).

**Solução**: Refetch completo em cada evento Realtime garante sincronização perfeita.

### 5. Infraestrutura Docker Swarm
**Vantagens**:
- ✅ Escalabilidade horizontal
- ✅ Alta disponibilidade (múltiplos replicas)
- ✅ Service discovery automático
- ✅ Isolamento de rede
- ✅ Fácil deploy e rollback

---

## 🔧 Variáveis de Ambiente

### Arquivo: `.env.local`

```bash
# Supabase (Auto-hospedado via Traefik)
NEXT_PUBLIC_SUPABASE_URL=https://supabase.seudominio.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# N8N Webhook (via Traefik)
N8N_WEBHOOK_URL=https://n8n.seudominio.com/webhook/tasks
```

### Variáveis Públicas vs Privadas
- `NEXT_PUBLIC_*`: Expostas ao browser (necessário para Supabase client)
- Sem `NEXT_PUBLIC_`: Apenas server-side (ex: `N8N_WEBHOOK_URL`)

### Configuração Docker Swarm

**Environment Variables nos Services**:
```yaml
services:
  nextjs-app:
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=https://supabase.seudominio.com
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - N8N_WEBHOOK_URL=https://n8n.seudominio.com/webhook/tasks
```

---

## 🚀 Como Executar

### Desenvolvimento Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais
# Usar URLs do Traefik (ex: https://supabase.seudominio.com)

# 3. Executar servidor de desenvolvimento
npm run dev

# 4. Acessar
http://localhost:3000
```

### Produção (Docker Swarm)

#### 1. Build da Imagem
```bash
# Build da imagem Next.js
docker build -t ai-todo-copilot:latest .

# Ou usar docker-compose para build
docker-compose build
```

#### 2. Deploy no Swarm
```bash
# Inicializar swarm (se ainda não estiver)
docker swarm init

# Deploy do stack
docker stack deploy -c docker-compose.yml ai-todo-copilot

# Verificar serviços
docker service ls

# Ver logs
docker service logs ai-todo-copilot_nextjs
```

#### 3. Configuração Traefik

**docker-compose.yml** (exemplo):
```yaml
version: '3.8'

services:
  nextjs-app:
    image: ai-todo-copilot:latest
    deploy:
      replicas: 2
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.nextjs.rule=Host(`app.seudominio.com`)"
        - "traefik.http.routers.nextjs.tls.certresolver=letsencrypt"
        - "traefik.http.services.nextjs.loadbalancer.server.port=3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=https://supabase.seudominio.com
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - N8N_WEBHOOK_URL=https://n8n.seudominio.com/webhook/tasks
    networks:
      - traefik-public
      - internal

networks:
  traefik-public:
    external: true
  internal:
    driver: overlay
```

### Produção (Vercel - Alternativa)

```bash
# 1. Build
npm run build

# 2. Deploy
vercel deploy

# 3. Configurar variáveis de ambiente no Vercel Dashboard
# Usar URLs do Traefik (ex: https://supabase.seudominio.com)
```

### Scripts Disponíveis
- `npm run dev` - Desenvolvimento (Turbopack)
- `npm run build` - Build de produção
- `npm run start` - Servidor de produção
- `npm run lint` - Linter ESLint

---

## 📊 Schema do Banco de Dados (Supabase)

### Tabela: `tasks`

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Realtime habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

### Campos Importantes
- `id`: UUID gerado automaticamente
- `title`: Título da tarefa (pode ser melhorado pelo N8N)
- `description`: Descrição gerada pelo N8N (ex: lista de compras)
- `completed`: Status de conclusão
- `user_id`: ID do usuário (RLS garante isolamento)

---

## 🐛 Problemas Conhecidos e Soluções

### 1. Erro: "Could not find the 'is_ai_processing' column"
**Causa**: Coluna não existe no schema.

**Solução**: Removido de `lib/tasks.ts`. Mantido apenas no estado React local.

### 2. Spinner "AI Optimizing" nunca para
**Causa**: Estado local não sincronizava com banco.

**Solução**: Refetch completo no Realtime remove automaticamente (banco não tem esse campo).

### 3. Realtime não atualiza após criação
**Causa**: ID mismatch (`tempId` vs `realId`).

**Solução**: 
- ID swap imediato após criação
- Refetch completo em eventos Realtime

### 4. Cookies não funcionam em HTTP (IP address)
**Causa**: Cookies `Secure` não funcionam em HTTP.

**Solução**: (Apenas dev) Modificar `utils/supabase/client.ts` para forçar cookies inseguros. **Revertido para produção** (HTTPS via Traefik).

### 5. WebSocket não conecta via Traefik
**Causa**: Traefik precisa de configuração especial para WebSocket.

**Solução**: Adicionar labels no Traefik:
```yaml
labels:
  - "traefik.http.services.supabase-realtime.loadbalancer.server.port=4000"
  - "traefik.http.routers.supabase-realtime.rule=Host(`supabase.seudominio.com`) && PathPrefix(`/realtime`)"
```

---

## 📝 Notas para Desenvolvedores

### Adicionar Nova Funcionalidade

1. **Nova função de banco**: Adicionar em `lib/tasks.ts` (receber `supabase` como parâmetro)
2. **Nova API Route**: Criar em `app/api/[nome]/route.ts`
3. **Novo componente**: Criar em `app/components/[Nome].tsx`

### Debugging

- **Realtime**: Verificar console do browser (logs com emojis 🔌 ⚡)
- **Auth**: Verificar cookies no DevTools → Application → Cookies
- **N8N**: Verificar logs do N8N e resposta do webhook
- **Docker Swarm**: `docker service logs [service-name]`
- **Traefik**: Verificar logs do Traefik para roteamento

### Performance

- **Optimistic UI**: Melhora percepção de velocidade
- **Refetch Strategy**: Garante consistência (trade-off: mais requisições)
- **Fire-and-forget N8N**: Não bloqueia UI
- **Docker Swarm**: Load balancing automático entre replicas

### Monitoramento

**Docker Swarm**:
```bash
# Status dos serviços
docker service ls

# Logs em tempo real
docker service logs -f ai-todo-copilot_nextjs

# Health checks
docker service ps ai-todo-copilot_nextjs
```

**Traefik Dashboard**:
- Acessar `https://traefik.seudominio.com/dashboard/`
- Ver rotas, serviços, e métricas

---

## 🎯 Próximos Passos (Roadmap)

- [ ] Adicionar filtros (todos, completos, pendentes)
- [ ] Adicionar busca de tarefas
- [ ] Adicionar categorias/tags
- [ ] Melhorar UI do spinner "AI Optimizing"
- [ ] Adicionar notificações push
- [ ] Suporte a múltiplos idiomas
- [ ] Métricas e monitoring (Prometheus/Grafana)
- [ ] Backup automático do Supabase
- [ ] CI/CD para Docker Swarm

---

## 📚 Referências

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [N8N Documentation](https://docs.n8n.io/)
- [Docker Swarm](https://docs.docker.com/engine/swarm/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)

---

**Última Atualização**: Dezembro 2024
**Versão**: 0.1.0
**Status**: Produção (Docker Swarm + Traefik)
**Infraestrutura**: Docker Swarm, Supabase Auto-hospedado, Traefik, Domínio Próprio


