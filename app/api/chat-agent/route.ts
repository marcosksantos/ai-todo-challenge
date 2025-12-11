import { NextRequest, NextResponse } from "next/server";
import { classifyMessage } from "@/lib/messageClassifier";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Initialize Supabase using the cookie store pattern
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Cookie setting can fail in certain contexts, ignore silently
            }
          },
        },
      }
    );

    // Get user via await supabase.auth.getUser()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Classify the message
    const classification = classifyMessage(message);

    // If it's a task creation, return the classification directly
    if (classification.action === "create") {
      return NextResponse.json(classification);
    }

    // Send payload to N8N for chat response
    const n8nChatUrl = process.env.N8N_CHAT_WEBHOOK_URL;

    if (!n8nChatUrl) {
      console.warn("[CHAT-AGENT] N8N_CHAT_WEBHOOK_URL not configured, using default reply");
      return NextResponse.json(classification);
    }

    // Payload: Send { message, user_id: user.id } to N8N
    const payload = {
      message,
      user_id: user.id,
    };

    console.log("[CHAT-AGENT] Calling N8N webhook:", n8nChatUrl);
    console.log("[CHAT-AGENT] Payload:", payload);

    try {
      // Create AbortController for timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(n8nChatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("[CHAT-AGENT] Response status:", response.status);

      // Read response body
      const responseText = await response.text();
      console.log("[CHAT-AGENT] Response body:", responseText || "(empty)");

      if (!response.ok) {
        console.error("[CHAT-AGENT] N8N webhook returned error status:", response.status, responseText);
        throw new Error(`N8N webhook returned ${response.status}: ${responseText}`);
      }

      // Try to parse as JSON
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log("[CHAT-AGENT] Parsed response:", data);
      } catch (parseError) {
        console.error("[CHAT-AGENT] Failed to parse response as JSON:", parseError);
        // If not JSON, use the text as reply
        return NextResponse.json({
          action: "reply",
          text: responseText || classification.text,
        });
      }

      // Return the JSON response from N8N
      const reply = data.reply || data.message || classification.text;
      console.log("[CHAT-AGENT] Final reply:", reply);

      return NextResponse.json({ action: "reply", text: reply });
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("[CHAT-AGENT] Request timeout after 30 seconds");
        return NextResponse.json(
          {
            action: "reply",
            text: "Sorry, the chat service took too long to respond. Please try again.",
          },
          { status: 504 }
        );
      }

      console.error("[CHAT-AGENT] Error calling N8N webhook:", error);
      console.error("[CHAT-AGENT] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      return NextResponse.json(
        { action: "reply", text: "Sorry, I'm having trouble connecting to the chat service." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Chat agent error:", error);
    return NextResponse.json(
      { action: "reply", text: "Sorry, I'm having trouble connecting to the chat service." },
      { status: 500 }
    );
  }
}
