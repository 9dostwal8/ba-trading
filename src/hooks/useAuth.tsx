import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: (session?.user ?? null) as User | null, loading };
}

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let active = true;

    const checkAdmin = async () => {
      try {
        // 1. Check RPC has_role (SECURITY DEFINER)
        const { data: rpcAdmin } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });

        if (rpcAdmin === true) {
          if (active) setIsAdmin(true);
          return;
        }

        // 2. Fallback to user_roles table
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (active) setIsAdmin(!!roleRow);
      } catch (err) {
        console.warn("useIsAdmin check error:", err);
        if (active) setIsAdmin(false);
      }
    };

    checkAdmin();
    return () => {
      active = false;
    };
  }, [userId]);

  return isAdmin;
}
