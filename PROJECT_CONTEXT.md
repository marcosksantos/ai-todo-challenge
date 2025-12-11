AI Todo Copilot - Estrutura e Contexto

1. Stack Tecnológico

Frontend: Next.js 16 (App Router)

Linguagem: TypeScript

Estilo: Tailwind CSS 3.4.17 (PostCSS + Autoprefixer)

Backend: Supabase (BaaS)

Automação: N8N (via Webhook)

2. Mapa da Estrutura de Arquivos (Atualizado)

Core

app/globals.css: Definições de Tailwind e temas (Dark Mode).
postcss.config.mjs: Configuração PostCSS (Tailwind v3 + Autoprefixer).
tailwind.config.ts: Configuração do Tailwind v3 (App Router, conteúdo em app/components).

app/layout.tsx: Wrapper principal da aplicação.

app/page.tsx: Página única que carrega o componente TodoList.

Componentes (Localização: /app/components/)

Nota: Todos os componentes visuais residem aqui.

TodoList.tsx: Componente "pai". Gerencia o estado, busca dados iniciais e escuta o Realtime do Supabase.

TodoItem.tsx: Componente "filho". Renderiza cada tarefa e botões de ação (editar/excluir).

Bibliotecas e Utilitários

/lib/tasks.ts: Contém TODAS as funções de banco de dados (getTasks, createTask, toggleTask, editTask, deleteTask). Agora aceita o cliente Supabase como parâmetro para ser SSR-safe.

/utils/supabase/client.ts: Cria cliente Supabase para uso no browser (Client Components).

/utils/supabase/server.ts: Cria cliente Supabase para uso no servidor (Server Components e Route Handlers).

/middleware.ts: Middleware Next.js que gerencia sessões e cookies do Supabase. Exclui /auth/callback para evitar quebra do PKCE.

API Backend (Localização: /app/api/)

n8n-trigger/route.ts: Endpoint que recebe POST do frontend e repassa para o Webhook do N8N (segurança).

3. Variáveis de Ambiente (.env.local)

O projeto depende destas chaves para rodar:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

N8N_WEBHOOK_URL (URL do Webhook de Produção do N8N)

4. Fluxos de Dados

Leitura: Frontend chama getTasks -> Supabase retorna dados.

Criação: Usuário digita -> Frontend salva no Supabase -> Frontend chama /api/n8n-trigger -> N8N processa.

Atualização Realtime: N8N altera o banco -> Supabase emite evento -> TodoList.tsx recebe evento e atualiza tela sem refresh.