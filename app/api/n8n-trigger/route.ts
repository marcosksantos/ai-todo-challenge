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

    // CRITICAL FIX: Start fetch and wait for request initiation (not completion)
    // This ensures the HTTP request is actually sent before Vercel shuts down
    const fetchInit = {
      method: "POST" as const,
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Task-Copilot-App/1.0"
      },
      body: JSON.stringify(n8nPayload),
    };

    // Start fetch and wait for it to be initiated (not completed)
    // Use Promise.race to wait only for the request to start, not finish
    const fetchPromise = fetch(webhookUrl, fetchInit);
    
    // Wait for request initiation with a short timeout
    // This ensures the HTTP request is queued and sent before function returns
    await Promise.race([
      fetchPromise.then(() => {
        console.log("✅ N8N Request initiated successfully");
      }),
      new Promise(resolve => setTimeout(resolve, 100)) // 100ms timeout to ensure request starts
    ]);

    // Log response in background (don't await)
    fetchPromise
      .then(res => {
        console.log("✅ N8N Response Status:", res.status);
        return res;
      })
      .catch(err => {
        console.error("🔥 N8N Fetch Error:", err);
      });

    return NextResponse.json({ success: true, sent_payload: n8nPayload });

  } catch (error) {
    console.error("💥 Critical Error in Trigger:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
