import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    try {
      // Create Supabase client for server-side
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Exchange code for session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`
        );
      }
    } catch (error: any) {
      console.error("Unexpected error in callback:", error);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message || "Authentication failed")}`
      );
    }
  }

  // Redirect back to home after login
  return NextResponse.redirect(requestUrl.origin);
}

