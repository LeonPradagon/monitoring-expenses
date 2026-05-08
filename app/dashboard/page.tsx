"use client";

import { useFamily } from "@/hooks/useFamily";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

import { TelegramConnect } from "@/components/TelegramConnect";
import { StatsDashboard } from "@/components/StatsDashboard";
import { TransactionList } from "@/components/TransactionList";
import { TransactionForm } from "@/components/TransactionForm";
import { CategoryManager } from "@/components/CategoryManager";
import { BalanceManager } from "@/components/BalanceManager";
import { getDashboardData, createFamily, joinFamily, getFamilyContext } from "@/lib/actions";

export default function DashboardPage() {
  const { family, member, loading, setFamily } = useFamily();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const handleCreateFamily = async () => {
    setCreating(true);
    try {
      const result = await createFamily(familyName);
      setFamily(result.family);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinFamily = async () => {
    setJoining(true);
    try {
      const result = await joinFamily(inviteCode);
      setFamily(result.family);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setJoining(false);
    }
  };

  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!family) return;

    async function fetchData() {
      setLoadingStats(true);
      const data = await getDashboardData(family.id);
      if (data) {
        setCategories(data.categories);
        setTransactions(data.transactions);
      }
      setLoadingStats(false);
    }

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `family_id=eq.${family.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [family]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Create Family */}
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Plus className="text-primary w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-white">Create Family</CardTitle>
              <CardDescription>Start a new group and invite your family members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Family Name (e.g. The Wilsons)" 
                  value={familyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFamilyName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCreateFamily} 
                className="w-full bg-primary hover:bg-primary/90" 
                disabled={creating || !familyName}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Group
              </Button>
            </CardFooter>
          </Card>

          {/* Join Family */}
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="text-emerald-500 w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-white">Join Family</CardTitle>
              <CardDescription>Enter a 6-digit code provided by your family admin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Invite Code (e.g. AB12CD)" 
                  value={inviteCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteCode(e.target.value)}
                  className="bg-white/5 border-white/10 uppercase"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleJoinFamily} 
                variant="outline" 
                className="w-full border-white/10 hover:bg-white/5" 
                disabled={joining || inviteCode.length < 6}
              >
                {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Group
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{family.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring
          </p>
        </div>
        <div className="flex items-center gap-6">
          <TelegramConnect familyMember={member} />
          <div className="flex gap-4">
            <Button variant="outline" className="border-white/5 bg-white/5 h-10 px-4">
              Invite: <span className="ml-2 font-mono text-primary font-bold">{family.invite_code}</span>
            </Button>
            <Button onClick={async () => {
               await supabase.auth.signOut();
               router.push("/auth");
            }} variant="ghost" className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 h-10">Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-12">
        {loadingStats ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <StatsDashboard transactions={transactions} categories={categories} family={family} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-12">
                <TransactionForm 
                  familyId={family.id} 
                  categories={categories} 
                  onSuccess={() => {
                    const fetchData = async () => {
                      const data = await getDashboardData(family.id);
                      if (data) {
                        setCategories(data.categories);
                        setTransactions(data.transactions);
                      }
                    };
                    fetchData();
                  }} 
                />
                <TransactionList transactions={transactions} familyName={family.name} />
              </div>
              
              <div className="space-y-8">
                <BalanceManager 
                  family={family} 
                  onUpdate={async () => {
                    const membership = await getFamilyContext();
                    if (membership) setFamily(membership.family);
                  }}
                />
                <CategoryManager 
                  categories={categories} 
                  onUpdate={async () => {
                    const data = await getDashboardData(family.id);
                    if (data) {
                      setCategories(data.categories);
                      setTransactions(data.transactions);
                    }
                  }} 
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
