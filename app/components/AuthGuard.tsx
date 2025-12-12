// AI Todo Copilot - AuthGuard Component
// Protects routes by verifying user authentication and redirecting to /auth if not authenticated

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that protects routes by checking user authentication.
 * Redirects to /auth if user is not authenticated.
 * 
 * @param children - React children to render when user is authenticated
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth");
          return;
        }

        setUser(user);
      } catch (error) {
        console.error("Error checking user:", error);
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for authentication state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.push("/auth");
      } else if (event === "SIGNED_IN" && session.user) {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // AuthGuard will redirect to /auth
  }

  return <>{children}</>;
}

