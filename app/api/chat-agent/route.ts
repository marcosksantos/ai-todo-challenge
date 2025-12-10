import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const n8nChatUrl = process.env.N8N_CHAT_WEBHOOK_URL;

    if (!n8nChatUrl) {
      return NextResponse.json(
        { error: "Chat webhook URL not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(n8nChatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`N8N webhook returned ${response.status}`);
    }

    const data = await response.json();
    const reply = data.reply || data.message || "I received your message, but couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat agent error:", error);
    return NextResponse.json(
      { error: "Internal error", reply: "Sorry, I'm having trouble connecting to the chat service." },
      { status: 500 }
    );
  }
}

