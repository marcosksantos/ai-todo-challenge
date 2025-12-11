# 🔍 RELATÓRIO DE AUDITORIA - SUPABASE AUTH + NEXT.JS 16

**Data:** $(date)  
**Projeto:** AI Todo Copilot  
**Stack:** Next.js 16.0.8 + Supabase + App Router

---

## 📋 PHASE 1: THE AUDIT

### 1. ✅ DEPENDENCY CHECK

**Status:** ✅ **CORRETO**

- `@supabase/ssr`: `^0.8.0` ✅ (Instalado)
- `@supabase/supabase-js`: `^2.87.1` ✅ (Instalado)
- `next`: `16.0.8` ✅ (App Router)

**Conclusão:** Dependências corretas instaladas.

---

### 2. ⚠️ MIDDLEWARE STATUS

**Arquivo:** `middleware.ts` (ROOT) ✅ **EXISTE**

**Análise:**
```1:33:middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This refreshes the session if expired
  await supabase.auth.getUser()

  return response
}
```

**PROBLEMAS IDENTIFICADOS:**

1. ❌ **CRÍTICO:** O `matcher` NÃO exclui `/auth/callback` explicitamente. Embora o comentário mencione, o regex pode não estar funcionando corretamente:
   ```typescript
   matcher: [
     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
   ]
   ```
   O padrão não exclui explicitamente `/auth/callback`, o que pode causar interferência no fluxo PKCE.

2. ⚠️ **POTENCIAL:** O middleware está chamando `getUser()` mas não está verificando se a requisição precisa de refresh. Isso pode causar overhead desnecessário.

**Conclusão:** Middleware existe e usa `createServerClient` corretamente, mas o `matcher` precisa ser ajustado para excluir explicitamente `/auth/callback`.

---

### 3. ❌ CLIENT ARCHITECTURE - PROBLEMA CRÍTICO

**Status:** ❌ **ARQUITETURA MISTA E CONFUSA**

#### 3.1. `lib/supabaseClient.ts` ✅ (CORRETO para Client Components)
```1:7:lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
```
**Status:** ✅ Usa `createBrowserClient` do `@supabase/ssr` - CORRETO.

#### 3.2. `lib/supabaseServer.ts` ❌ (ERRADO - Biblioteca Incorreta)
```1:37:lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Create a Supabase client for server-side usage
 * Attempts to read session from cookies (Supabase client-side stores session in localStorage,
 * but we can check for any auth-related cookies that might be set)
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Create a standard Supabase client
  // Note: In production, you'd want to use @supabase/auth-helpers-nextjs
  // For now, we'll use a basic client and rely on the client-side session
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Try to get session from cookies if available
  // Supabase stores session in localStorage on client, but we check cookies as fallback
  const accessToken = cookieStore.get("sb-access-token")?.value;
  if (accessToken) {
    // Set the session if we have a token
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: cookieStore.get("sb-refresh-token")?.value || "",
    });
  }

  return supabase;
}
```

**PROBLEMAS CRÍTICOS:**

1. ❌ **BIBLIOTECA ERRADA:** Usa `createClient` de `@supabase/supabase-js` em vez de `createServerClient` de `@supabase/ssr`
2. ❌ **COOKIES INCORRETOS:** Tenta ler `sb-access-token` e `sb-refresh-token` que NÃO são os nomes corretos dos cookies do Supabase SSR
3. ❌ **NÃO USA O PADRÃO SSR:** Não segue o padrão de cookies do `@supabase/ssr` (que usa `getAll()` e `setAll()`)
4. ⚠️ **NÃO É USADO:** Este arquivo não parece estar sendo importado em lugar nenhum (verificado via busca)

**Conclusão:** Arquivo `supabaseServer.ts` está obsoleto e usa padrão incorreto. Deve ser removido ou reescrito.

#### 3.3. Uso em `lib/tasks.ts`
```1:1:lib/tasks.ts
import { supabase } from "./supabaseClient";
```
**Status:** ⚠️ **PROBLEMÁTICO** - `tasks.ts` importa o cliente browser, mas é usado em componentes client (`TodoList.tsx`), então tecnicamente funciona, mas não segue o padrão SSR recomendado.

#### 3.4. Uso em `app/api/n8n-trigger/route.ts` ✅ (CORRETO)
```8:27:app/api/n8n-trigger/route.ts
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
        } catch {
          // Ignorar erros em API Routes
        }
      },
    },
  }
)
```
**Status:** ✅ Usa `createServerClient` do `@supabase/ssr` corretamente.

---

### 4. ✅ CALLBACK ROUTE

**Arquivo:** `app/auth/callback/route.ts` ✅ **EXISTE E ESTÁ CORRETO**

```1:56:app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      // Initialize Supabase using the cookie store pattern for SSR
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
              } catch {
                // Cookie setting can fail in certain contexts, ignore silently
              }
            },
          },
        }
      )

      // Exchange code for session - this will set cookies automatically
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(
          `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`
        )
      }

      // Success! Redirect to home page
      return NextResponse.redirect(requestUrl.origin)
    } catch (error: any) {
      console.error('Unexpected error in callback:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message || 'Authentication failed')}`
      )
    }
  }

  // No code provided, redirect to auth page
  return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('No authorization code provided')}`)
}
```

**Status:** ✅ **CORRETO** - Usa `createServerClient` e `exchangeCodeForSession` corretamente.

**POTENCIAL PROBLEMA:**
- ⚠️ O middleware pode estar interferindo nesta rota se o `matcher` não excluir corretamente `/auth/callback`.

---

## 🔴 DIAGNÓSTICO DOS ERROS REPORTADOS

### Erro 1: `invalid request: both auth code and code verifier should be non-empty`

**CAUSA RAIZ IDENTIFICADA:**

1. ❌ **Middleware interferindo no callback:** O `matcher` do middleware pode estar processando `/auth/callback` antes do `exchangeCodeForSession`, causando perda do `code_verifier` armazenado em cookie.

2. ⚠️ **Fluxo PKCE quebrado:** O `code_verifier` é armazenado em cookie durante o `signInWithOAuth`, mas se o middleware processar a requisição antes do callback, o cookie pode não estar disponível.

**SOLUÇÃO:**
- Excluir explicitamente `/auth/callback` do `matcher` do middleware.

---

### Erro 2: `CHANNEL_ERROR` (Realtime)

**CAUSA RAIZ IDENTIFICADA:**

```69:144:app/components/TodoList.tsx
// 2. Configuração do Realtime (Só roda se tiver User) - CRÍTICO: Protege contra CHANNEL_ERROR
useEffect(() => {
  if (!user) {
    console.log("[REALTIME] Aguardando usuário antes de criar channel...");
    return;
  }

  console.log(`🔌 Iniciando Realtime para usuário: ${user.id}`);

  const channel = supabase
    .channel(`realtime:tasks:${user.id}`)
    ...
```

**Status:** ✅ O código JÁ tem proteção (`if (!user) return`), mas o problema pode ser:

1. ⚠️ **Sessão não sincronizada:** O `user` pode estar sendo setado antes da sessão estar completamente estabelecida no Supabase, causando `CHANNEL_ERROR`.

2. ⚠️ **Cliente singleton:** O `supabase` é um singleton importado, e se a sessão não estiver sincronizada entre o cliente e o servidor, o Realtime pode falhar.

**SOLUÇÃO:**
- Garantir que o `user` só seja setado após confirmação da sessão via `getSession()` ou `getUser()`.
- Considerar usar um hook customizado que aguarda a sessão estar pronta.

---

### Erro 3: Code Mismatch (createClient vs createServerClient)

**CAUSA RAIZ IDENTIFICADA:**

1. ❌ **Arquivo obsoleto:** `lib/supabaseServer.ts` usa `createClient` (biblioteca errada).
2. ⚠️ **Uso inconsistente:** `lib/tasks.ts` usa cliente browser, mas deveria ser server-side se usado em Server Actions.
3. ✅ **API Routes corretas:** `app/api/n8n-trigger/route.ts` usa `createServerClient` corretamente.

**SOLUÇÃO:**
- Remover `lib/supabaseServer.ts` (obsoleto).
- Criar `utils/supabase/client.ts` e `utils/supabase/server.ts` seguindo o padrão oficial.
- Atualizar todos os imports.

---

## 📊 RESUMO EXECUTIVO

| Item | Status | Severidade |
|------|--------|------------|
| Dependências | ✅ OK | - |
| Middleware | ⚠️ Precisa ajuste | 🔴 Alta |
| Client Architecture | ❌ Mista/Confusa | 🔴 Crítica |
| Callback Route | ✅ OK | - |
| PKCE Flow | ❌ Quebrado | 🔴 Crítica |
| Realtime Setup | ⚠️ Pode melhorar | 🟡 Média |

---

## 🎯 PRÓXIMOS PASSOS

Ver **PHASE 2: THE REFACTORING PLAN** no próximo documento.

