// AI Todo Copilot - Chat API Route
// Proxies chat messages to N8N webhook for AI processing

import { NextResponse } from 'next/server'

/**
 * POST handler that proxies chat messages to N8N webhook.
 * Validates request and forwards message to AI service.
 * 
 * @param request - Request object containing message and user_id
 * @returns JSON response with AI reply
 */
export async function POST(request: Request) {
  try {
    const { message, user_id } = await request.json();

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get N8N webhook URL from environment variables
    const n8nUrl = process.env.N8N_CHAT_WEBHOOK_URL;
    
    if (!n8nUrl) {
      console.error('[CHAT] N8N_CHAT_WEBHOOK_URL not configured');
      return NextResponse.json(
        { error: 'Chat service not configured' },
        { status: 500 }
      );
    }

    // Forward request to N8N webhook
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_id }),
    });

    // Check if response is ok
    if (!response.ok) {
      console.error('[CHAT] N8N webhook returned error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to communicate with AI' },
        { status: response.status }
      );
    }

    // Parse and return N8N response
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[CHAT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to communicate with AI' },
      { status: 500 }
    )
  }
}

