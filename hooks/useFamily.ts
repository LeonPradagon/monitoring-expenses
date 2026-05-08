import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFamilyContext } from "@/lib/actions";

export function useFamily() {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    async function fetchFamily() {
      const membership = await getFamilyContext();
      if (membership) {
        setMember(membership);
        setFamily(membership.family);
      }
      setLoading(false);
    }

    fetchFamily();
  }, [session]);

  return { family, member, loading, setFamily };
}
