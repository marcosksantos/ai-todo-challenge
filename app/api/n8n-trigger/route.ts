import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
            } catch {
              // Ignorar erros em API Routes
            }
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Erro de Auth na API:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId, title } = await request.json()

    if (!taskId || !title) {
      return NextResponse.json({ error: 'Missing taskId or title' }, { status: 400 })
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL não definida')
      return NextResponse.json({ error: 'Configuration Error' }, { status: 500 })
    }

    // Fire and forget para o N8N
    fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: taskId,
        title: title,
        user_id: user.id,
        action: 'improve_title'
      }),
    }).catch((err) => console.error('Erro ao chamar N8N:', err))

    return NextResponse.json({ success: true, message: 'Enviado para IA' })
  } catch (error) {
    console.error('Erro interno na API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
