import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🚀 API Trigger Called"); 
  try {
    // Parse body FIRST to minimize blocking operations before fetch
    const body = await request.json();
    console.log("📦 Payload received:", body);
    
    // Fallback for both naming conventions to be safe
    const taskId = body.taskId || body.id;
    const title = body.title;

    if (!taskId || !title) {
      console.error("❌ Missing Data:", body);
      return NextResponse.json({ error: "Missing taskId or title" }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    console.log("🔗 Target N8N URL:", webhookUrl ? "Found (Hidden)" : "MISSING!!");

    if (!webhookUrl) {
      return NextResponse.json({ error: "Server Configuration Error: N8N_WEBHOOK_URL missing" }, { status: 500 });
    }

    // Authenticate user (required for user_id in payload)
    // CRITICAL: Do this as quickly as possible to minimize delay before fetch
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Force strict JSON structure for N8N
    const n8nPayload = {
      id: taskId,
      title: title,
      user_id: user.id,
      action: "improve_title"
    };

    // CRITICAL: Initiate fetch IMMEDIATELY after all validations
    // The fetch() call starts the HTTP request synchronously when called
    // We must ensure it's called before the function returns to prevent Vercel cancellation
    const fetchInit = {
      method: "POST" as const,
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Task-Copilot-App/1.0"
      },
      body: JSON.stringify(n8nPayload),
    };

    // Start the fetch immediately - this queues the HTTP request
    // The void operator ensures we don't await, but the request is already initiated
    void fetch(webhookUrl, fetchInit)
      .then(res => {
        console.log("✅ N8N Response Status:", res.status);
        return res;
      })
      .catch(err => {
        console.error("🔥 N8N Fetch Error:", err);
      });

    // Return immediately after initiating fetch
    // The HTTP request is already queued and will be sent even if function returns
    return NextResponse.json({ success: true, sent_payload: n8nPayload });

  } catch (error) {
    console.error("💥 Critical Error in Trigger:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
