import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🚀 API Trigger Called"); 
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // Force strict JSON structure for N8N
    const n8nPayload = {
      id: taskId,
      title: title,
      user_id: user.id,
      action: "improve_title"
    };

    // Send to N8N (Fire and Forget but with logging)
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    }).then(res => {
        console.log("✅ N8N Response Status:", res.status);
    }).catch(err => {
        console.error("🔥 N8N Fetch Error:", err);
    });

    return NextResponse.json({ success: true, sent_payload: n8nPayload });

  } catch (error) {
    console.error("💥 Critical Error in Trigger:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
