# Documentação Completa - AI Todo Copilot

## 📋 Visão Geral do Projeto

**AI Todo Copilot** é uma aplicação web moderna de gerenciamento de tarefas (To-Do List) com integração de Inteligência Artificial. A aplicação permite que usuários criem tarefas que são automaticamente refinadas e melhoradas por um agente de IA através do N8N e OpenAI.

### Stack Tecnológico

- **Frontend**: Next.js 16 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS 3.4.17
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Autenticação**: Supabase Auth
- **Automação**: N8N (workflow automation)
- **IA**: OpenAI (via N8N)
- **Ícones**: Lucide React

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Diretórios

```
ai-todo-copilot/
├── app/
│   ├── api/                    # Rotas de API (Backend)
│   │   ├── chat/               # Endpoint para chatbot
│   │   └── n8n-trigger/        # Endpoint para acionar N8N
│   ├── auth/                   # Páginas de autenticação
│   ├── components/             # Componentes React (Client Components)
│   │   ├── AuthGuard.tsx       # Proteção de rotas
│   │   ├── TodoList.tsx        # Lista principal de tarefas
│   │   ├── TodoItem.tsx        # Item individual de tarefa
│   │   ├── Chatbot.tsx         # Chatbot flutuante
│   │   ├── WhatsAppButton.tsx # Botão WhatsApp (antigo)
│   │   └── WhatsAppConnectButton.tsx # Botão WhatsApp (novo)
│   ├── globals.css             # Estilos globais Tailwind
│   ├── layout.tsx               # Layout raiz
│   └── page.tsx                 # Página principal
├── lib/
│   ├── tasks.ts                # Funções de CRUD de tarefas
│   └── types.ts                # Tipos TypeScript
└── utils/
    └── supabase/
        ├── client.ts            # Cliente Supabase (browser)
        └── server.ts            # Cliente Supabase (server)
```

---

## 🔑 Componentes Principais

### 1. **AuthGuard.tsx** - Proteção de Rotas

**Função**: Garante que apenas usuários autenticados acessem a aplicação.

**Como funciona**:
- Verifica se há um usuário autenticado via `supabase.auth.getUser()`
- Se não houver usuário, redireciona para `/auth`
- Escuta mudanças de autenticação (`onAuthStateChange`)
- Mostra loading enquanto verifica autenticação
- Renderiza `children` apenas se o usuário estiver autenticado

**Localização**: `app/components/AuthGuard.tsx`

---

### 2. **TodoList.tsx** - Componente Principal

**Função**: Gerencia a lista completa de tarefas do usuário.

**Funcionalidades principais**:

#### a) **Inicialização e Autenticação**
- Carrega o usuário autenticado
- Busca tarefas iniciais do Supabase
- Gerencia estados: `tasks`, `user`, `loading`, `submitting`

#### b) **Supabase Realtime Subscription**
- Escuta eventos em tempo real da tabela `tasks`:
  - **INSERT**: Adiciona nova tarefa ao estado local
  - **UPDATE**: Atualiza tarefa específica (importante para atualizações do N8N)
  - **DELETE**: Remove tarefa do estado local
- Proteção contra sobrescrita: não atualiza tarefas que o usuário está editando
- Status de conexão: mostra "Online" ou status de erro

#### c) **Criação de Tarefas**
- **Otimistic Update**: Mostra a tarefa imediatamente com ID temporário
- Salva no Supabase
- Substitui ID temporário pelo ID real do banco
- Aciona N8N via `/api/n8n-trigger` para processamento de IA
- Mostra indicador "AI Optimizing..." enquanto processa

#### d) **Gerenciamento de Estado**
- `expandedTaskId`: Controla qual tarefa está expandida
- `editingTaskIds`: Set de IDs de tarefas sendo editadas (proteção Realtime)
- Handlers: `handleToggle`, `handleEdit`, `handleEditDescription`, `handleDelete`

#### e) **Logout**
- Função `handleLogout` que chama `supabase.auth.signOut()`
- Botão "Sign Out" no header

**Localização**: `app/components/TodoList.tsx`

---

### 3. **TodoItem.tsx** - Item de Tarefa Individual

**Função**: Renderiza cada tarefa com funcionalidades de edição e expansão.

**Estados**:
- **Colapsado**: Mostra apenas checkbox, título e ícone de expandir
- **Expandido**: Mostra título editável, textarea para descrição e botões de ação

**Funcionalidades**:

#### a) **Edição Inline**
- Título editável quando expandido
- Textarea para descrição/notas
- Botões "Save" e "Cancel"
- Auto-resize do textarea

#### b) **Validação e Sincronização**
- Sincroniza com atualizações do Realtime
- Preserva estado de edição local
- Remove flag `is_ai_processing` quando título é atualizado pela IA

#### c) **UI/UX**
- Cards expansíveis com transições suaves
- Visual hierarchy: background diferente quando expandido
- Indicador de processamento de IA (badge animado)
- Checkbox com animação ao completar

**Localização**: `app/components/TodoItem.tsx`

---

### 4. **Chatbot.tsx** - Chatbot Flutuante

**Função**: Interface de chat com assistente de IA.

**Funcionalidades**:
- Botão flutuante no canto inferior direito
- Janela de chat expansível
- Integração com `/api/chat`
- Envia `message` e `user_id` para a API
- Suporta diferentes formatos de resposta do N8N
- Auto-scroll para última mensagem
- Fecha ao clicar fora

**Fluxo**:
1. Usuário digita mensagem
2. Frontend envia para `/api/chat` com `{ message, user_id }`
3. API roteia para N8N webhook
4. Resposta do N8N é exibida no chat

**Localização**: `app/components/Chatbot.tsx`

---

### 5. **WhatsAppConnectButton.tsx** - Conexão WhatsApp

**Função**: Permite que usuários conectem seu número de telefone para habilitar o chatbot via WhatsApp.

**Funcionalidades**:

#### a) **Floating Action Button**
- Posição: `bottom-6 right-6`, `z-index: 50`
- Cor verde (`bg-green-500`)
- Ícone `MessageCircle` do Lucide

#### b) **Modal de Conexão**
- Input para número de telefone
- Placeholder: `1 (555) 123-4567` (formato US)
- Helper text: "Enter your number including Country Code (DDI)."

#### c) **Validação e Sanitização**
- **Sanitização**: Remove todos caracteres não numéricos
  - Exemplo: `+55 (22) 99744-8979` → `5522997448979`
- **Validação**: Mínimo 8 dígitos
- **Visual**: Borda vermelha e mensagem de erro se inválido
- **Sem alerts**: Usa apenas validação visual inline

#### d) **Fluxo de Salvamento**
1. Valida e sanitiza o número
2. Salva na tabela `profiles` (coluna `phone`) para o `user.id`
3. Usa `upsert` com fallback para `insert`
4. Ao sucesso: fecha modal e abre WhatsApp Web
5. Mensagem pré-preenchida: "Hello! I just connected my account.\n\n#to-do list Buy coffee"

**Localização**: `app/components/WhatsAppConnectButton.tsx`

---

## 🔌 API Routes (Backend)

### 1. **`/api/chat/route.ts`** - Endpoint de Chat

**Função**: Proxy seguro para comunicação com N8N chatbot.

**Fluxo**:
1. Recebe `POST` com `{ message, user_id }`
2. Valida campos obrigatórios
3. Encaminha para `N8N_CHAT_WEBHOOK_URL`
4. Retorna resposta do N8N para o frontend

**Benefícios**:
- Resolve problemas de CORS
- Mantém webhook do N8N privado
- Validação de entrada

**Variável de ambiente**: `N8N_CHAT_WEBHOOK_URL`

---

### 2. **`/api/n8n-trigger/route.ts`** - Trigger de IA

**Função**: Aciona workflow do N8N para processar tarefas com IA.

**Fluxo**:
1. Autentica usuário via Supabase
2. Recebe `{ taskId, title }`
3. Envia para `N8N_WEBHOOK_URL` com:
   ```json
   {
     "id": taskId,
     "title": title,
     "user_id": user.id,
     "action": "improve_title"
   }
   ```
4. Fire-and-forget (não espera resposta)

**Variável de ambiente**: `N8N_WEBHOOK_URL`

---

## 💾 Banco de Dados (Supabase)

### Tabela: `tasks`

**Schema**:
```sql
- id: UUID (primary key)
- title: TEXT
- completed: BOOLEAN
- description: TEXT (nullable)
- user_id: UUID (foreign key → auth.users)
- created_at: TIMESTAMP
```

**Operações**:
- `getTasks`: Busca todas as tarefas do usuário (ordenadas por data)
- `createTask`: Cria nova tarefa
- `toggleTask`: Alterna status de completado
- `editTask`: Atualiza título
- `updateTaskDescription`: Atualiza descrição
- `deleteTask`: Remove tarefa

**Realtime**: Habilitado para eventos INSERT, UPDATE, DELETE

---

### Tabela: `profiles`

**Schema** (assumido):
```sql
- id: UUID (primary key, foreign key → auth.users)
- phone: TEXT (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Operações**:
- `upsert`: Atualiza ou cria perfil com número de telefone

---

## 🔄 Fluxos de Dados Principais

### 1. **Criação de Tarefa com IA**

```
Usuário digita tarefa
    ↓
TodoList.tsx: handleAddTask()
    ↓
1. Optimistic Update (mostra imediatamente)
    ↓
2. createTask() → Supabase
    ↓
3. Substitui ID temporário pelo real
    ↓
4. POST /api/n8n-trigger → N8N
    ↓
N8N processa com OpenAI
    ↓
N8N atualiza tasks.description no Supabase
    ↓
Supabase Realtime emite evento UPDATE
    ↓
TodoList.tsx recebe evento
    ↓
Atualiza UI automaticamente
```

---

### 2. **Chat com IA**

```
Usuário digita no Chatbot
    ↓
Chatbot.tsx: handleSend()
    ↓
POST /api/chat { message, user_id }
    ↓
API valida e encaminha para N8N_CHAT_WEBHOOK_URL
    ↓
N8N processa com OpenAI
    ↓
N8N retorna resposta
    ↓
API retorna para frontend
    ↓
Chatbot exibe resposta
```

---

### 3. **Conexão WhatsApp**

```
Usuário clica no botão WhatsApp
    ↓
Modal abre
    ↓
Usuário digita número (ex: +55 (22) 99744-8979)
    ↓
Validação: mínimo 8 dígitos
    ↓
Sanitização: remove não-numéricos → 5522997448979
    ↓
Salva em profiles.phone
    ↓
Abre WhatsApp Web com mensagem pré-preenchida
```

---

## 🎨 Design System

### Cores Principais

- **Background**: `#030712` (dark slate)
- **Cards**: `bg-slate-900/30` (colapsado), `bg-slate-800/40` (expandido)
- **Primary**: `bg-purple-600` (botões principais)
- **Success**: `bg-green-500` (WhatsApp, checkboxes)
- **Error**: `text-red-500`, `border-red-500` (validação)

### Componentes Visuais

- **Cards**: Bordas arredondadas (`rounded-lg`), sombras sutis
- **Inputs**: Dark theme, focus ring colorido
- **Botões**: Hover effects, disabled states
- **Transições**: `transition-all duration-200/300`

---

## 🔐 Segurança

### Autenticação
- Supabase Auth com PKCE flow
- Middleware gerencia sessões
- AuthGuard protege rotas

### API Routes
- Validação de autenticação em todas as rotas
- Validação de entrada (message, user_id)
- Webhooks do N8N não expostos no frontend

### Banco de Dados
- Row Level Security (RLS) no Supabase
- Filtros por `user_id` em todas as queries
- Validação de ownership antes de operações

---

## 🚀 Variáveis de Ambiente

**Arquivo**: `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon

# N8N Webhooks
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/tasks
N8N_CHAT_WEBHOOK_URL=https://seu-n8n.com/webhook/chat
```

---

## 📱 Funcionalidades Especiais

### 1. **Realtime Updates**
- Atualizações automáticas quando N8N modifica tarefas
- Proteção contra sobrescrita durante edição
- Status de conexão visível no header

### 2. **Optimistic Updates**
- UI atualiza imediatamente antes da confirmação do servidor
- Melhora percepção de velocidade
- Rollback automático em caso de erro

### 3. **Card Expansion Pattern**
- Design inspirado em Pomofocus/Todoist
- Estado colapsado: compacto e limpo
- Estado expandido: edição completa com descrição

### 4. **AI Processing Indicator**
- Badge animado "AI Optimizing..." durante processamento
- Remove automaticamente quando IA completa

---

## 🐛 Tratamento de Erros

### Frontend
- Try/catch em todas as operações assíncronas
- Mensagens de erro descritivas
- Logs no console para debug
- Rollback de optimistic updates em caso de falha

### Backend
- Validação de entrada
- Tratamento de erros do Supabase
- Fallbacks para operações críticas
- Status HTTP apropriados

---

## 🔧 Padrões de Código

### Imports
- Usa alias `@/` para imports absolutos
- Exemplo: `import X from "@/app/components/X"`

### Componentes
- Todos os componentes visuais em `app/components/`
- Client Components marcados com `"use client"`
- Server Components quando possível

### Estilização
- Apenas Tailwind CSS (sem inline styles)
- Dark mode por padrão
- Responsive design com breakpoints do Tailwind

### TypeScript
- Tipos definidos em `lib/types.ts`
- Interfaces para props de componentes
- Type safety em todas as operações

---

## 📊 Estado da Aplicação

### Estados Globais (por componente)

**TodoList**:
- `tasks`: Array de tarefas
- `user`: Usuário autenticado
- `expandedTaskId`: ID da tarefa expandida
- `editingTaskIds`: Set de IDs em edição
- `realtimeStatus`: Status da conexão Realtime

**Chatbot**:
- `messages`: Array de mensagens
- `isOpen`: Estado do modal
- `isLoading`: Estado de carregamento

**WhatsAppConnectButton**:
- `phone`: Número digitado
- `isModalOpen`: Estado do modal
- `error`: Mensagem de erro

---

## 🎯 Casos de Uso Principais

### 1. Usuário cria tarefa
1. Digita "comprar leite"
2. Tarefa aparece imediatamente
3. N8N processa e melhora para "Buy milk"
4. Descrição é adicionada automaticamente
5. UI atualiza sem refresh

### 2. Usuário edita tarefa
1. Clica para expandir card
2. Edita título e descrição
3. Salva
4. Realtime confirma atualização

### 3. Usuário conecta WhatsApp
1. Clica no botão verde
2. Digita número com código do país
3. Sistema sanitiza e valida
4. Salva no perfil
5. Abre WhatsApp automaticamente

### 4. Usuário conversa com IA
1. Abre chatbot
2. Digita pergunta
3. IA responde via N8N
4. Conversa continua no chat

---

## 🔍 Pontos de Atenção

### 1. **Realtime vs Edição**
- Sistema protege edições em andamento
- `editingTaskIds` previne sobrescrita
- Timeout de 1s após edição para permitir sync

### 2. **Sanitização de Telefone**
- Remove TODOS caracteres não numéricos
- Não adiciona prefixos automaticamente
- Validação mínima de 8 dígitos

### 3. **Optimistic Updates**
- IDs temporários para novas tarefas
- Substituição pelo ID real após criação
- Rollback em caso de erro

### 4. **N8N Integration**
- Fire-and-forget para triggers de tarefas
- Aguarda resposta para chat
- Timeout de 30s no chat-agent (rota antiga)

---

## 📝 Notas de Implementação

### Migração para Supabase Cloud
- Polling fallback foi removido
- Realtime agora funciona nativamente
- Handlers granulares para INSERT/UPDATE/DELETE

### UI/UX Improvements
- Design inspirado em Pomofocus/Todoist
- Cards expansíveis
- Validação visual sem alerts
- Feedback imediato em todas as ações

### Internacionalização
- Todo o texto da UI em inglês
- Mensagens de erro em inglês
- Comentários em inglês

---

## 🚦 Como Usar Este Documento

Este documento serve como **contexto completo** para conversas com IA sobre o projeto. Ele explica:

1. **O que o projeto faz**: Aplicação de To-Do com IA
2. **Como funciona**: Fluxos de dados e arquitetura
3. **Onde está cada coisa**: Estrutura de arquivos
4. **Por que foi feito assim**: Decisões de design e padrões

Use este documento quando:
- Precisar explicar o projeto para uma IA
- Adicionar novas funcionalidades
- Debuggar problemas
- Onboarding de novos desenvolvedores

---

## 📌 Checklist de Funcionalidades

- ✅ Autenticação com Supabase
- ✅ CRUD completo de tarefas
- ✅ Realtime updates
- ✅ Integração com N8N/OpenAI
- ✅ Chatbot integrado
- ✅ Conexão WhatsApp
- ✅ Edição inline de tarefas
- ✅ Cards expansíveis
- ✅ Validação visual
- ✅ Logout
- ✅ Responsive design
- ✅ Dark mode

---

**Última atualização**: Baseado no estado atual do código
**Versão**: 1.0
**Autor**: Documentação gerada para contexto de IA

