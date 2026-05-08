"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Loader2, CheckCircle2 } from "lucide-react";

export function TelegramConnect({ familyMember }: { familyMember: any }) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(
    familyMember?.telegram_link_code,
  );
  const supabase = createClient();

  const generateCode = async () => {
    setLoading(true);
    const newCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    const { error } = await supabase
      .from("family_members")
      .update({ telegram_link_code: newCode })
      .eq("id", familyMember.id);

    if (!error) {
      setCode(newCode);
    }
    setLoading(false);
  };

  if (familyMember?.telegram_id) {
    return (
      <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full text-xs font-medium">
        <CheckCircle2 size={14} /> Connected to Telegram
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {code ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Send this code to our bot:
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-primary/20 text-primary px-3 py-1 rounded font-mono text-sm">
              {code}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() =>
                window.open(`https://t.me/Nanalysbot?start=${code}`, "_blank")
              }
            >
              Open Telegram
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="border-primary/20 text-primary hover:bg-primary/10"
          onClick={generateCode}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <MessageSquare className="w-4 h-4 mr-2" />
          )}
          Connect Telegram
        </Button>
      )}
    </div>
  );
}
