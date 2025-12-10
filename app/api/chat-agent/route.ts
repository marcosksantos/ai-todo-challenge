import { NextRequest, NextResponse } from "next/server";
import { classifyMessage } from "@/lib/messageClassifier";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Classify the message
    const classification = classifyMessage(message);

    // If it's a task creation, return the classification directly
    if (classification.action === "create") {
      return NextResponse.json(classification);
    }

    // Otherwise, send to N8N for chat response
    const n8nChatUrl = process.env.N8N_CHAT_WEBHOOK_URL;

    if (!n8nChatUrl) {
      // If N8N not configured, return the default reply
      return NextResponse.json(classification);
    }

    const response = await fetch(n8nChatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, classification }),
    });

    if (!response.ok) {
      throw new Error(`N8N webhook returned ${response.status}`);
    }

    const data = await response.json();
    const reply = data.reply || data.message || classification.text;

    return NextResponse.json({ action: "reply", text: reply });
  } catch (error) {
    console.error("Chat agent error:", error);
    return NextResponse.json(
      { action: "reply", text: "Sorry, I'm having trouble connecting to the chat service." },
      { status: 500 }
    );
  }
}

