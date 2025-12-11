# 🔧 PLANO DE REFATORAÇÃO - SUPABASE SSR AUTH PATTERN

**Baseado em:** AUDIT_REPORT.md  
**Objetivo:** Implementar o padrão oficial Supabase SSR Auth para Next.js 16 App Router

---

## 📋 ESTRATÉGIA GERAL

Seguir o padrão oficial do Supabase para Next.js 16:
- **Client Components:** `createBrowserClient` (via hook customizado)
- **Server Components/API Routes:** `createServerClient` com cookies
- **Middleware:** Refresh de sessão + exclusão explícita de `/auth/callback`

---

## 🎯 STEP 1: CORRIGIR MIDDLEWARE

**Arquivo:** `middleware.ts`

**Mudanças:**
1. Excluir explicitamente `/auth/callback` do `matcher`
2. Adicionar logging para debug (opcional)
3. Garantir que o refresh de sessão não interfira no callback

**Código Proposto:**
```typescript
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (CRITICAL: Must exclude to prevent PKCE flow breakage)
     * - auth (exclude entire auth route to avoid interference)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth).*)',
  ],
}
```

**Justificativa:** O middleware não deve processar `/auth/callback` porque:
- O callback precisa trocar o `code` por `session` sem interferência
- O `code_verifier` está armazenado em cookie e não deve ser acessado pelo middleware durante o callback
- Evita race conditions no fluxo PKCE

---

## 🎯 STEP 2: REORGANIZAR ARQUITETURA DE CLIENTES

**Objetivo:** Criar estrutura clara seguindo o padrão Supabase SSR.

### 2.1. Criar `utils/supabase/client.ts`

**Novo arquivo:** `utils/supabase/client.ts`

**Função:** Cliente para uso em Client Components (substitui `lib/supabaseClient.ts`)

**Código:**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Nota:** Usar função em vez de singleton para evitar problemas de estado compartilhado.

### 2.2. Criar `utils/supabase/server.ts`

**Novo arquivo:** `utils/supabase/server.ts`

**Função:** Cliente para uso em Server Components, Server Actions e API Routes

**Código:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

### 2.3. Remover arquivos obsoletos

**Arquivos para remover:**
- ❌ `lib/supabaseClient.ts` (substituído por `utils/supabase/client.ts`)
- ❌ `lib/supabaseServer.ts` (substituído por `utils/supabase/server.ts`)

**Justificativa:** Limpar código obsoleto e seguir estrutura padrão.

---

## 🎯 STEP 3: REWRITE CALLBACK ROUTE (Verificação)

**Arquivo:** `app/auth/callback/route.ts`

**Status:** ✅ Já está correto, mas vamos adicionar melhorias:

**Melhorias Propostas:**
1. Adicionar logging para debug
2. Verificar se o `code_verifier` está presente antes de trocar
3. Melhorar tratamento de erros

**Código Melhorado:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    console.error('[CALLBACK] No authorization code provided')
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent('No authorization code provided')}`
    )
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              console.error('[CALLBACK] Error setting cookies:', error)
            }
          },
        },
      }
    )

    console.log('[CALLBACK] Exchanging code for session...')
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[CALLBACK] Error exchanging code for session:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`
      )
    }

    console.log('[CALLBACK] Session established successfully')
    return NextResponse.redirect(requestUrl.origin)
  } catch (error: any) {
    console.error('[CALLBACK] Unexpected error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message || 'Authentication failed')}`
    )
  }
}
```

---

## 🎯 STEP 4: FIX `TodoList.tsx` - CLIENT COMPONENT

**Arquivo:** `app/components/TodoList.tsx`

**Mudanças Necessárias:**

### 4.1. Atualizar Import

**Antes:**
```typescript
import { supabase } from "@/lib/supabaseClient";
```

**Depois:**
```typescript
import { createClient } from "@/utils/supabase/client";
```

### 4.2. Criar Instância do Cliente no Componente

**Adicionar no início do componente:**
```typescript
const supabase = createClient()
```

**Justificativa:** Usar função em vez de singleton evita problemas de estado compartilhado e garante que cada componente tenha sua própria instância.

### 4.3. Melhorar Verificação de Sessão antes do Realtime

**Problema Atual:**
```typescript
useEffect(() => {
  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      setUser(session.user);
      // ...
    }
  };
  initAuth();
}, []);
```

**Solução Melhorada:**
```typescript
useEffect(() => {
  const initAuth = async () => {
    // 1. Verificar sessão atual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[AUTH] Error getting session:', sessionError);
      setLoading(false);
      return;
    }

    if (session?.user) {
      // 2. Confirmar que o usuário está autenticado no servidor também
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('[AUTH] Error getting user:', userError);
        setLoading(false);
        return;
      }

      // 3. Só então setar o user e carregar tasks
      setUser(user);
      // ... resto do código
    } else {
      setLoading(false);
    }

    // 4. Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!userError && user) {
          setUser(user);
          // ... resto do código
        }
      } else {
        setUser(null);
        setTasks([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  };

  initAuth();
}, []);
```

**Justificativa:** 
- Verificar tanto `getSession()` quanto `getUser()` garante que a sessão está válida
- O listener `onAuthStateChange` já atualiza quando necessário
- Logging ajuda no debug

### 4.4. Garantir que Realtime só inicia após confirmação

**Código Atual já tem proteção:**
```typescript
useEffect(() => {
  if (!user) {
    console.log("[REALTIME] Aguardando usuário antes de criar channel...");
    return;
  }
  // ...
}, [user]);
```

**Melhoria Adicional:**
```typescript
useEffect(() => {
  if (!user) {
    console.log("[REALTIME] Aguardando usuário antes de criar channel...");
    return;
  }

  // Verificar sessão antes de criar channel
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error || !session) {
      console.error("[REALTIME] No valid session, skipping channel creation");
      return;
    }

    console.log(`🔌 Iniciando Realtime para usuário: ${user.id}`);

    const channel = supabase
      .channel(`realtime:tasks:${user.id}`)
      // ... resto do código
  });
}, [user]);
```

---

## 🎯 STEP 5: ATUALIZAR `lib/tasks.ts`

**Arquivo:** `lib/tasks.ts`

**Problema:** Atualmente importa `supabase` de `lib/supabaseClient.ts` (que será removido).

**Solução:** Como `tasks.ts` é usado apenas em Client Components (`TodoList.tsx`), podemos:

**Opção A (Recomendada):** Passar o cliente como parâmetro
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

export async function getTasks(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, description")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ... outras funções seguem o mesmo padrão
```

**Opção B:** Criar cliente dentro de cada função (menos eficiente)
```typescript
import { createClient } from "@/utils/supabase/client";

export async function getTasks(userId: string) {
  const supabase = createClient();
  // ... resto do código
}
```

**Recomendação:** Usar Opção A para melhor testabilidade e controle.

**Atualizar `TodoList.tsx` para passar o cliente:**
```typescript
const supabase = createClient();

const loadTasks = async (userId: string) => {
  try {
    const data = await getTasks(supabase, userId);
    // ...
  }
};

const handleAddTask = async (e: FormEvent) => {
  // ...
  const task = await createTask(supabase, newTask.trim(), user.id);
  // ...
};
```

---

## 🎯 STEP 6: ATUALIZAR `app/auth/page.tsx`

**Arquivo:** `app/auth/page.tsx`

**Mudança Necessária:**

**Antes:**
```typescript
import { supabase } from "@/lib/supabaseClient";
```

**Depois:**
```typescript
import { createClient } from "@/utils/supabase/client";

// Dentro do componente:
const supabase = createClient();
```

---

## 🎯 STEP 7: VERIFICAR E ATUALIZAR OUTROS ARQUIVOS

**Buscar todos os imports de `supabaseClient`:**
```bash
grep -r "from.*supabaseClient" app/ lib/
```

**Arquivos que precisam ser atualizados:**
- ✅ `app/components/TodoList.tsx` (já identificado)
- ✅ `app/auth/page.tsx` (já identificado)
- ✅ `app/components/AuthGuard.tsx` (encontrado via grep)
- ⚠️ `app/components/TodoItem.tsx` (NÃO usa Supabase diretamente, apenas importa funções de `tasks.ts`)

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Preparação
- [ ] Criar diretório `utils/supabase/`
- [ ] Criar `utils/supabase/client.ts`
- [ ] Criar `utils/supabase/server.ts`

### Fase 2: Middleware
- [ ] Atualizar `middleware.ts` com matcher corrigido
- [ ] Testar que `/auth/callback` não é processado pelo middleware

### Fase 3: Callback
- [ ] Melhorar `app/auth/callback/route.ts` com logging
- [ ] Testar fluxo OAuth completo

### Fase 4: Componentes Client
- [ ] Atualizar `app/components/TodoList.tsx`:
  - [ ] Mudar import para `createClient`
  - [ ] Criar instância no componente
  - [ ] Melhorar verificação de sessão
  - [ ] Garantir Realtime só inicia após sessão confirmada
- [ ] Atualizar `app/auth/page.tsx`:
  - [ ] Mudar import para `createClient`
  - [ ] Criar instância no componente
- [ ] Atualizar `app/components/AuthGuard.tsx`:
  - [ ] Mudar import para `createClient`
  - [ ] Criar instância no componente
  - [ ] Melhorar verificação de sessão (similar ao TodoList)

### Fase 5: Tasks
- [ ] Atualizar `lib/tasks.ts` para receber cliente como parâmetro
- [ ] Atualizar todas as chamadas em `TodoList.tsx`

### Fase 6: Limpeza
- [ ] Remover `lib/supabaseClient.ts`
- [ ] Remover `lib/supabaseServer.ts`
- [ ] Verificar que não há mais imports dos arquivos antigos

### Fase 7: Testes
- [ ] Testar login com email/password
- [ ] Testar login com OAuth (Google)
- [ ] Testar callback após OAuth
- [ ] Testar Realtime após login
- [ ] Testar logout
- [ ] Verificar que não há mais erros de `code_verifier`
- [ ] Verificar que não há mais `CHANNEL_ERROR`

---

## 🔍 ORDEM DE EXECUÇÃO RECOMENDADA

1. **STEP 1** (Middleware) - Crítico para resolver PKCE
2. **STEP 2** (Arquitetura) - Base para tudo
3. **STEP 3** (Callback) - Garantir que está robusto
4. **STEP 4** (TodoList) - Componente principal
5. **STEP 5** (Tasks) - Funções auxiliares
6. **STEP 6** (Auth Page) - Página de login
7. **STEP 7** (Verificação) - Limpeza final

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Não remover arquivos antigos até atualizar todos os imports**
2. **Testar cada step antes de prosseguir**
3. **Manter backups ou commits entre steps**
4. **O middleware deve ser o primeiro a ser corrigido (resolve o PKCE)**
5. **Verificar que o `matcher` do middleware realmente exclui `/auth/callback`**

---

## 📚 REFERÊNCIAS

- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js 16 App Router + Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

**Status:** ⏸️ **AGUARDANDO CONFIRMAÇÃO DO USUÁRIO PARA EXECUTAR**

