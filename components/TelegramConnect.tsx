"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, CheckCircle2 } from "lucide-react";

export function TelegramConnect({ user }: { user: any }) {
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    async function checkStatus() {
      const { data } = await supabase.from('user_settings').select('telegram_chat_id').eq('user_id', user.id).single();
      if (data?.telegram_chat_id) {
        setIsConnected(true);
      }
    }
    checkStatus();
  }, [user, supabase]);

  if (!user) return null;

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full text-xs font-medium">
        <CheckCircle2 size={14} /> Connected to Telegram
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="sm"
          className="border-primary/20 text-primary hover:bg-primary/10"
          onClick={() => window.open(`https://t.me/Nanalysbot?start=${user.id}`, "_blank")}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Connect Telegram
        </Button>
    </div>
  );
}
