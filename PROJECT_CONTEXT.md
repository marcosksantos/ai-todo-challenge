AI Todo Copilot - Estrutura e Contexto

1. Stack Tecnológico

Frontend: Next.js 16 (App Router)

Linguagem: TypeScript

Estilo: Tailwind CSS 3.4.17 (PostCSS + Autoprefixer)

Backend: Supabase Cloud (PostgreSQL + Realtime)

Automação: N8N (via Webhook)

IA: OpenAI (via N8N)

Ícones: Lucide React

2. Mapa da Estrutura de Arquivos (Atualizado)

Core

app/globals.css: Definições de Tailwind e temas (Dark Mode).
postcss.config.mjs: Configuração PostCSS (Tailwind v3 + Autoprefixer).
tailwind.config.ts: Configuração do Tailwind v3 (App Router, conteúdo em app/components).

app/layout.tsx: Wrapper principal da aplicação.

app/page.tsx: Página única que carrega os componentes principais.

Componentes (Localização: /app/components/)

Nota: Todos os componentes visuais residem aqui.

AuthGuard.tsx: Proteção de rotas. Verifica autenticação e redireciona para /auth se necessário.

TodoList.tsx: Componente principal. Gerencia estado, busca dados iniciais, escuta Realtime do Supabase (INSERT/UPDATE/DELETE), e gerencia expansão de cards.

TodoItem.tsx: Componente de item individual. Renderiza tarefas com cards expansíveis (estilo Pomofocus). Permite edição inline de título e descrição.

Chatbot.tsx: Chatbot flutuante. Integra com /api/chat para comunicação com IA via N8N.

WhatsAppConnectButton.tsx: Botão flutuante para conectar WhatsApp. Modal com input de telefone, validação, sanitização e salvamento em profiles. Abre WhatsApp Web após salvar.

Bibliotecas e Utilitários

/lib/tasks.ts: Contém TODAS as funções de banco de dados (getTasks, createTask, toggleTask, editTask, deleteTask, updateTaskDescription). Aceita cliente Supabase como parâmetro.

/lib/types.ts: Tipos TypeScript (Task interface).

/utils/supabase/client.ts: Cria cliente Supabase para uso no browser (Client Components).

/utils/supabase/server.ts: Cria cliente Supabase para uso no servidor (Server Components e Route Handlers).

/middleware.ts: Middleware Next.js que gerencia sessões e cookies do Supabase. Exclui /auth/callback para evitar quebra do PKCE.

API Backend (Localização: /app/api/)

chat/route.ts: Endpoint para chatbot. Recebe { message, user_id } e encaminha para N8N_CHAT_WEBHOOK_URL. Resolve CORS e mantém webhook privado.

n8n-trigger/route.ts: Endpoint que recebe POST do frontend e repassa para o Webhook do N8N (segurança). Fire-and-forget para processamento de IA.

3. Variáveis de Ambiente (.env.local)

O projeto depende destas chaves para rodar:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

N8N_WEBHOOK_URL (URL do Webhook de Produção do N8N para tarefas)

N8N_CHAT_WEBHOOK_URL (URL do Webhook do N8N para chatbot)

4. Fluxos de Dados

Leitura: Frontend chama getTasks -> Supabase retorna dados.

Criação: Usuário digita -> Frontend salva no Supabase -> Frontend chama /api/n8n-trigger -> N8N processa com OpenAI.

Atualização Realtime: N8N altera o banco -> Supabase emite evento -> TodoList.tsx recebe evento e atualiza tela sem refresh. Sistema protege edições em andamento.

Chat: Usuário digita -> Frontend chama /api/chat -> API encaminha para N8N -> Resposta é exibida.

WhatsApp: Usuário digita telefone -> Valida e sanitiza -> Salva em profiles.phone -> Abre WhatsApp Web.

5. Funcionalidades Principais

- CRUD completo de tarefas com Realtime
- Edição inline de título e descrição
- Cards expansíveis (estilo Pomofocus)
- Integração com IA via N8N/OpenAI
- Chatbot integrado
- Conexão WhatsApp
- Logout funcional
- Validação visual (sem alerts)
- Optimistic updates
- Proteção contra conflitos Realtime