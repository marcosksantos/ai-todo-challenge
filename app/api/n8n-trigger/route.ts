// AI Todo Copilot - N8N Trigger API Route
// Proxies task creation events to N8N webhook for AI processing

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * POST handler that triggers N8N webhook for AI task processing.
 * Authenticates user, validates request, and fires webhook asynchronously.
 * 
 * @param request - Request object containing taskId and title
 * @returns JSON response with success status
 */
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
              // Ignore errors in API Routes (cookies may be read-only)
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
      console.error('[N8N-TRIGGER] Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, title } = body

    // Validate request body
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid taskId' }, { status: 400 })
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid title' }, { status: 400 })
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.error('[N8N-TRIGGER] N8N_WEBHOOK_URL not configured')
      return NextResponse.json({ error: 'Configuration Error' }, { status: 500 })
    }

    // Prepare payload for N8N (snake_case as expected by N8N)
    const n8nPayload = {
      id: taskId,
      title: title,
      user_id: user.id,
      action: 'improve_title'
    }

    // Fire-and-forget: Trigger N8N webhook asynchronously
    fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
    }).catch((error) => {
      console.error('[N8N-TRIGGER] Error calling N8N webhook:', error)
    })

    return NextResponse.json({ success: true, message: 'Sent to AI' })
  } catch (error) {
    console.error('[N8N-TRIGGER] Internal error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
